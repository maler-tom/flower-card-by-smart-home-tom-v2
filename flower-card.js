/**
 * 🌸 Flower Card – Smart Home Tom V2
 * Eine eigenständige Lovelace Custom Card für Pflanzensensoren.
 * Zeigt Bodenfeuchte, Temperatur, Licht und EC mit farbigen Balken.
 *
 * Repo: https://github.com/maler-tom/flower-card-by-smart-home-tom-v2
 *
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
 *
 *   soil_warn_low: 30    # Warnschwelle zu trocken (Standard: 30)
 *   soil_warn_high: 80   # Warnschwelle zu nass (Standard: 80)
 *   ec_warn_low: 300     # Warnschwelle zu wenig Dünger (Standard: 300)
 *   ec_warn_high: 1200   # Warnschwelle zu viel Dünger (Standard: 1200)
 */

const VERSION = "2.0.0";

// Registrierung für HACS / HA Card Picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "flower-card",
  name: "Flower Card – Smart Home Tom",
  description: "Pflanzenkarte mit Bodenfeuchte, Temperatur, Licht und EC – by Smart Home Tom",
  preview: false,
  documentationURL: "https://github.com/maler-tom/flower-card-by-smart-home-tom-v2",
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
    this._setupMode = false;
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
    if (this._initialized) {
      if (this._setupMode) {
        this._renderSetup();
      } else {
        this._update();
      }
    }
  }

  setConfig(config) {
    // Prüfen ob Pflichtfelder fehlen → Setup-Modus
    const required = ["soil", "temp", "lux", "ec"];
    const missing = required.some(key => !config[key]);

    if (missing) {
      this._setupMode = true;
      this._config = config || {};
    } else {
      this._setupMode = false;
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
    }

    if (this._initialized) {
      if (this._setupMode) {
        this._renderSetup();
      } else {
        this._update();
      }
    }
  }

  getCardSize() {
    return 4;
  }

  static getStubConfig() {
    return {};
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
          .fc-edit-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(255,255,255,0.15);
            border: none;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            cursor: pointer;
            font-size: 15px;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
          }
          .fc-edit-btn:hover {
            background: rgba(255,255,255,0.28);
          }
          .fc-wrap-outer {
            position: relative;
          }

          /* Setup Styles */
          .fc-setup {
            border-radius: 20px;
            padding: 20px 22px 18px;
            background: rgba(255,255,255,0.09);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border: 1px solid rgba(255,255,255,0.22);
            box-shadow: 0 4px 12px rgba(0,0,0,0.28);
            color: #ffffff;
            font-family: var(--primary-font-family, sans-serif);
          }
          .fc-setup-title {
            font-size: 17px;
            font-weight: 700;
            text-align: center;
            margin-bottom: 16px;
          }
          .fc-setup-row {
            display: grid;
            grid-template-columns: 110px 1fr;
            align-items: center;
            margin-bottom: 10px;
            gap: 8px;
          }
          .fc-setup-label {
            font-size: 13px;
            opacity: 0.85;
            white-space: nowrap;
          }
          .fc-setup-input {
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 10px;
            color: #fff;
            padding: 7px 10px;
            font-size: 13px;
            width: 100%;
            box-sizing: border-box;
            outline: none;
            transition: border 0.2s;
          }
          .fc-setup-input:focus {
            border-color: rgba(124,252,0,0.7);
          }
          .fc-setup-select {
            background: rgba(30,30,30,0.85);
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 10px;
            color: #fff;
            padding: 7px 10px;
            font-size: 13px;
            width: 100%;
            box-sizing: border-box;
            outline: none;
            cursor: pointer;
            transition: border 0.2s;
          }
          .fc-setup-select:focus {
            border-color: rgba(124,252,0,0.7);
          }
          .fc-setup-select option {
            background: #1e1e1e;
            color: #fff;
          }
          .fc-save-btn {
            width: 100%;
            margin-top: 14px;
            padding: 10px;
            background: linear-gradient(135deg, #7CFC00, #32CD32);
            border: none;
            border-radius: 12px;
            color: #000;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          .fc-save-btn:hover {
            opacity: 0.88;
          }
          .fc-cancel-btn {
            width: 100%;
            margin-top: 8px;
            padding: 8px;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            color: #fff;
            font-size: 13px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .fc-cancel-btn:hover {
            background: rgba(255,255,255,0.18);
          }
          .fc-search-box {
            background: rgba(255,255,255,0.12);
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 10px;
            color: #fff;
            padding: 5px 10px;
            font-size: 12px;
            width: 100%;
            box-sizing: border-box;
            outline: none;
            margin-bottom: 4px;
          }
          .fc-search-box::placeholder {
            color: rgba(255,255,255,0.45);
          }
          .fc-field-wrap {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
        </style>
        <div id="fc-content"></div>
      </ha-card>
    `;

    if (this._setupMode) {
      this._renderSetup();
    } else {
      this._renderCard();
      this._update();
    }
  }

  // -------------------------------------------------------------------
  // Setup-Modus rendern
  // -------------------------------------------------------------------
  _renderSetup() {
    if (!this._hass) return;

    // Alle Sensor-Entitäten aus HA holen
    const allSensors = Object.keys(this._hass.states)
      .filter(id => id.startsWith("sensor."))
      .sort();

    const cfg = this._config || {};

    const sensorOptions = (selected) => `
      <option value="">– Sensor auswählen –</option>
      ${allSensors.map(id => `
        <option value="${id}" ${selected === id ? "selected" : ""}>${id}</option>
      `).join("")}
    `;

    this.querySelector("#fc-content").innerHTML = `
      <div class="fc-setup">
        <div class="fc-setup-title">🌸 Flower Card Einrichten</div>

        <div class="fc-setup-row">
          <div class="fc-setup-label">🪴 Pflanzenname</div>
          <input class="fc-setup-input" id="fc-plant-name" type="text"
            placeholder="z.B. Monstera" value="${cfg.plant_name || ""}">
        </div>

        <div class="fc-setup-row">
          <div class="fc-setup-label">🌱 Bodenfeuchte</div>
          <div class="fc-field-wrap">
            <input class="fc-search-box" id="search-soil" placeholder="🔍 Sensor suchen…">
            <select class="fc-setup-select" id="fc-soil">${sensorOptions(cfg.soil)}</select>
          </div>
        </div>

        <div class="fc-setup-row">
          <div class="fc-setup-label">🌡️ Temperatur</div>
          <div class="fc-field-wrap">
            <input class="fc-search-box" id="search-temp" placeholder="🔍 Sensor suchen…">
            <select class="fc-setup-select" id="fc-temp">${sensorOptions(cfg.temp)}</select>
          </div>
        </div>

        <div class="fc-setup-row">
          <div class="fc-setup-label">☀️ Licht</div>
          <div class="fc-field-wrap">
            <input class="fc-search-box" id="search-lux" placeholder="🔍 Sensor suchen…">
            <select class="fc-setup-select" id="fc-lux">${sensorOptions(cfg.lux)}</select>
          </div>
        </div>

        <div class="fc-setup-row">
          <div class="fc-setup-label">⚡ EC-Wert</div>
          <div class="fc-field-wrap">
            <input class="fc-search-box" id="search-ec" placeholder="🔍 Sensor suchen…">
            <select class="fc-setup-select" id="fc-ec">${sensorOptions(cfg.ec)}</select>
          </div>
        </div>

        <button class="fc-save-btn" id="fc-save-btn">💾 Speichern</button>
        ${!this._setupMode || cfg.soil ? `<button class="fc-cancel-btn" id="fc-cancel-btn">✕ Abbrechen</button>` : ""}
      </div>
    `;

    // Suchfunktion für jeden Sensor-Dropdown
    [
      ["search-soil", "fc-soil"],
      ["search-temp", "fc-temp"],
      ["search-lux",  "fc-lux"],
      ["search-ec",   "fc-ec"],
    ].forEach(([searchId, selectId]) => {
      const searchEl = this.querySelector(`#${searchId}`);
      const selectEl = this.querySelector(`#${selectId}`);
      searchEl.addEventListener("input", () => {
        const term = searchEl.value.toLowerCase();
        Array.from(selectEl.options).forEach(opt => {
          opt.style.display = opt.value === "" || opt.value.toLowerCase().includes(term)
            ? "" : "none";
        });
      });
    });

    // Speichern Button
    this.querySelector("#fc-save-btn").addEventListener("click", () => {
      this._saveConfig();
    });

    // Abbrechen Button
    const cancelBtn = this.querySelector("#fc-cancel-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        this._setupMode = false;
        this._renderCard();
        this._update();
      });
    }
  }

  // -------------------------------------------------------------------
  // Konfiguration speichern
  // -------------------------------------------------------------------
  _saveConfig() {
    const plantName = this.querySelector("#fc-plant-name").value.trim() || "Pflanze";
    const soil = this.querySelector("#fc-soil").value;
    const temp = this.querySelector("#fc-temp").value;
    const lux  = this.querySelector("#fc-lux").value;
    const ec   = this.querySelector("#fc-ec").value;

    if (!soil || !temp || !lux || !ec) {
      alert("⚠️ Bitte alle Sensoren auswählen!");
      return;
    }

    this._config = {
      plant_name:     plantName,
      soil:           soil,
      temp:           temp,
      lux:            lux,
      ec:             ec,
      soil_max:       this._config.soil_max       ?? 100,
      temp_max:       this._config.temp_max       ?? 40,
      lux_max:        this._config.lux_max        ?? 10000,
      ec_max:         this._config.ec_max         ?? 2000,
      soil_warn_low:  this._config.soil_warn_low  ?? 30,
      soil_warn_high: this._config.soil_warn_high ?? 80,
      ec_warn_low:    this._config.ec_warn_low    ?? 300,
      ec_warn_high:   this._config.ec_warn_high   ?? 1200,
    };

    this._setupMode = false;
    this._renderCard();
    this._update();

    // HA Card Editor Event feuern
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  // -------------------------------------------------------------------
  // Card-Modus rendern
  // -------------------------------------------------------------------
  _renderCard() {
    this.querySelector("#fc-content").innerHTML = `
      <div class="fc-wrap-outer">
        <div class="fc-wrap">
          <div class="fc-icon" id="fc-icon">🌸</div>
          <div class="fc-name" id="fc-name">Pflanze</div>
          <span class="fc-status" id="fc-status">⏳ Lade…</span>
          <hr class="fc-divider">
          <div class="fc-bars" id="fc-bars"></div>
        </div>
        <button class="fc-edit-btn" id="fc-edit-btn" title="Einstellungen">✏️</button>
      </div>
    `;

    // Edit Button → Setup-Modus
    this.querySelector("#fc-edit-btn").addEventListener("click", () => {
      this._setupMode = true;
      this._renderSetup();
    });
  }

  // -------------------------------------------------------------------
  // Daten aktualisieren
  // -------------------------------------------------------------------
  _update() {
    if (!this._hass || !this._config || this._setupMode) return;

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

    // DOM-Updates
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
