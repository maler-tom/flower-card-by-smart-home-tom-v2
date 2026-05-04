/**
 * 🌸 Flower Card – Smart Home Tom
 * Eine eigenständige Lovelace Custom Card für Pflanzensensoren.
 * Zeigt Bodenfeuchte, Temperatur, Licht und EC mit farbigen Balken.
 *
 * Repo: https://github.com/maler-tom/flower-card
 * Konfiguration:
 *   type: custom:flower-card
 *   plant_name: "Meine Pflanze"
 *   soil: sensor.meine_pflanze_soil
 *   temp: sensor.meine_pflanze_temp
 *   lux: sensor.meine_pflanze_lux
 *   ec: sensor.meine_pflanze_ec
 *
 * Optional:
 *   soil_max: 100        # Maximalwert Bodenfeuchte (Standard: 100)
 *   temp_max: 40         # Maximalwert Temperatur (Standard: 40)
 *   lux_max: 10000       # Maximalwert Licht (Standard: 10000)
 *   ec_max: 2000         # Maximalwert EC (Standard: 2000)
 *   soil_warn_low: 30    # Warnschwelle zu trocken (Standard: 30)
 *   soil_warn_high: 80   # Warnschwelle zu nass (Standard: 80)
 *   ec_warn_low: 300     # Warnschwelle zu wenig Dünger (Standard: 300)
 *   ec_warn_high: 1200   # Warnschwelle zu viel Dünger (Standard: 1200)
 */

const VERSION = "1.0.0";

// Registrierung für HACS / HA Card Picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "flower-card",
  name: "Flower Card – Smart Home Tom",
  description: "Pflanzenkarte mit Bodenfeuchte, Temperatur, Licht und EC – by Smart Home Tom",
  preview: false,
  documentationURL: "https://github.com/maler-tom/flower-card",
});

class FlowerCard extends HTMLElement {
  // -------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------
  constructor() {
    super();
    this._hass = null;
    this._config = null;
    this._initialized = false;
  }

  connectedCallback() {
    if (!this._initialized) {
      this._buildDOM();
      this._initialized = true;
    }
  }

  // -------------------------------------------------------------------
  // Home Assistant Hooks
  // -------------------------------------------------------------------
  set hass(hass) {
    this._hass = hass;
    if (this._initialized) this._update();
  }

  setConfig(config) {
    // Pflichtfelder prüfen
    const required = ["soil", "temp", "lux", "ec"];
    for (const key of required) {
      if (!config[key]) throw new Error(`flower-card: '${key}' muss angegeben werden.`);
    }

    this._config = {
      plant_name:     config.plant_name     || "Pflanze",
      soil:           config.soil,
      temp:           config.temp,
      lux:            config.lux,
      ec:             config.ec,
      soil_max:       config.soil_max       ?? 100,
      temp_max:       config.temp_max       ?? 40,
      lux_max:        config.lux_max        ?? 10000,
      ec_max:         config.ec_max         ?? 2000,
      soil_warn_low:  config.soil_warn_low  ?? 30,
      soil_warn_high: config.soil_warn_high ?? 80,
      ec_warn_low:    config.ec_warn_low    ?? 300,
      ec_warn_high:   config.ec_warn_high   ?? 1200,
    };

    if (this._initialized) this._update();
  }

  getCardSize() {
    return 4;
  }

  static getStubConfig() {
    return {
      plant_name: "Meine Pflanze",
      soil: "sensor.example_soil",
      temp: "sensor.example_temp",
      lux: "sensor.example_lux",
      ec: "sensor.example_ec",
    };
  }

  // -------------------------------------------------------------------
  // DOM aufbauen (einmalig)
  // -------------------------------------------------------------------
  _buildDOM() {
    this.innerHTML = `
      <ha-card>
        <style>
          .fc-wrap {
            border-radius: 20px;
            padding: 20px 22px 18px;
            background: rgba(255,255,255,0.09);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border: 1px solid rgba(255,255,255,0.22);
            box-shadow: 0 4px 12px rgba(0,0,0,0.28);
            color: #ffffff;
            text-align: center;
            font-family: var(--primary-font-family, sans-serif);
            user-select: none;
          }
          .fc-icon {
            font-size: 2.8em;
            line-height: 1.1;
            transition: all 0.5s ease;
          }
          .fc-name {
            font-size: 17px;
            font-weight: 700;
            margin: 6px 0 2px;
            letter-spacing: 0.3px;
          }
          .fc-status {
            display: inline-block;
            font-size: 13px;
            font-weight: 600;
            opacity: 0.88;
            margin-top: 4px;
            padding: 3px 10px;
            border-radius: 20px;
            background: rgba(255,255,255,0.12);
          }
          .fc-bars {
            margin-top: 16px;
            text-align: left;
          }
          .fc-row {
            display: grid;
            grid-template-columns: 88px 1fr 58px;
            align-items: center;
            margin-bottom: 9px;
            font-size: 13px;
          }
          .fc-label {
            opacity: 0.78;
            white-space: nowrap;
          }
          .fc-val {
            text-align: right;
            font-weight: 700;
            font-size: 12px;
            opacity: 0.92;
          }
          .fc-bar-bg {
            height: 7px;
            background: rgba(255,255,255,0.18);
            border-radius: 10px;
            overflow: hidden;
            margin: 0 9px;
          }
          .fc-bar-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
          }
          .fc-divider {
            border: none;
            border-top: 1px solid rgba(255,255,255,0.12);
            margin: 14px 0 12px;
          }
        </style>
        <div class="fc-wrap">
          <div class="fc-icon" id="fc-icon">🌸</div>
          <div class="fc-name" id="fc-name">Pflanze</div>
          <span class="fc-status" id="fc-status">⏳ Lade…</span>
          <hr class="fc-divider">
          <div class="fc-bars" id="fc-bars"></div>
        </div>
      </ha-card>
    `;
  }

  // -------------------------------------------------------------------
  // Daten aktualisieren
  // -------------------------------------------------------------------
  _update() {
    if (!this._hass || !this._config) return;

    const cfg = this._config;

    const getVal = (entity_id) => {
      const s = this._hass.states[entity_id];
      if (!s) return null;
      const n = parseFloat(s.state);
      return isNaN(n) ? null : n;
    };

    const soil = getVal(cfg.soil);
    const temp = getVal(cfg.temp);
    const lux  = getVal(cfg.lux);
    const ec   = getVal(cfg.ec);

    // Icon & Status berechnen
    let icon = "🌸";
    if (soil === null) {
      icon = "❓";
    } else if (soil < cfg.soil_warn_low) {
      icon = "🥀";
    } else if (soil < 40) {
      icon = "🌼";
    } else if (soil < 70) {
      icon = "🌸";
    } else {
      icon = "💧";
    }

    let status = "🟢 Alles OK";
    if (soil === null || ec === null) {
      status = "⚠️ Sensor nicht verfügbar";
    } else if (soil < cfg.soil_warn_low) {
      status = "💧 Gießen empfohlen";
    } else if (soil > cfg.soil_warn_high) {
      status = "🚨 Zu nass!";
    } else if (ec < cfg.ec_warn_low) {
      status = "⚡ Düngen empfohlen";
    } else if (ec > cfg.ec_warn_high) {
      status = "🚨 Zu viel Dünger!";
    }

    // DOM-Updates (nur geänderte Elemente)
    this.querySelector("#fc-icon").textContent = icon;
    this.querySelector("#fc-name").textContent = cfg.plant_name;
    this.querySelector("#fc-status").textContent = status;

    // Balken rendern
    const fmt = (v) => v !== null ? v : "–";
    const pct = (v, max) => v !== null ? Math.max(0, Math.min(100, (v / max) * 100)).toFixed(1) : 0;

    const bars = [
      { label: "🌱 Boden", value: soil, max: cfg.soil_max, color: "#7CFC00", unit: "%" },
      { label: "🌡 Temp",  value: temp, max: cfg.temp_max,  color: "#4db8ff", unit: "°C" },
      { label: "☀️ Licht",  value: lux,  max: cfg.lux_max,   color: "#ffa64d", unit: " lx" },
      { label: "⚡ EC",     value: ec,   max: cfg.ec_max,    color: "#b07cff", unit: " µS" },
    ];

    this.querySelector("#fc-bars").innerHTML = bars.map(b => `
      <div class="fc-row">
        <div class="fc-label">${b.label}</div>
        <div class="fc-bar-bg">
          <div class="fc-bar-fill" style="width:${pct(b.value, b.max)}%;background:${b.color};"></div>
        </div>
        <div class="fc-val">${fmt(b.value)}${b.value !== null ? b.unit : ""}</div>
      </div>
    `).join("");
  }
}

customElements.define("flower-card", FlowerCard);
console.info(
  `%c FLOWER-CARD %c v${VERSION} – Smart Home Tom `,
  "color:#fff;background:#7CFC00;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
  "color:#7CFC00;background:#111;font-weight:500;padding:2px 6px;border-radius:0 4px 4px 0;"
);
