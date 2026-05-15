/**
 * 🌸 Flower Card – Smart Home Tom V2
 * Eine eigenständige Lovelace Custom Card für Pflanzensensoren.
 *
 * Repo: https://github.com/maler-tom/flower-card-by-smart-home-tom-v2
 *
 * Konfiguration:
 *   type: custom:flower-card
 *   entity: plant.meine_pflanze
 *
 * Optional:
 *   display_type: full        # full (Standard) oder compact
 *   battery_sensor: sensor.x  # Batterie-Sensor
 *   hide_image: false          # Pflanzenbild ausblenden
 *   hide_species: false        # Pflanzenart ausblenden
 *   show_bars:                 # Welche Balken anzeigen
 *     - moisture
 *     - temperature
 *     - illuminance
 *     - conductivity
 *     - humidity
 *   extra_badges:              # Zusätzliche Badges
 *     - entity: sensor.x
 */

const VERSION = "2.0.0";

window.customCards = window.customCards || [];
window.customCards.push({
  type: "flower-card",
  name: "Flower Card – Smart Home Tom",
  description: "Pflanzenkarte mit Glassmorphism Design – by Smart Home Tom",
  preview: false,
  documentationURL: "https://github.com/maler-tom/flower-card-by-smart-home-tom-v2",
});

// -------------------------------------------------------------------
// Hilfsfunktionen
// -------------------------------------------------------------------
const BAR_CONFIG = {
  moisture:       { label: "🌱 Boden",   unit: "%",    color: "#7CFC00", attr: "moisture",       min_attr: "min_moisture",       max_attr: "max_moisture"       },
  temperature:    { label: "🌡 Temp",    unit: "°C",   color: "#4db8ff", attr: "temperature",    min_attr: "min_temperature",    max_attr: "max_temperature"    },
  illuminance:    { label: "☀️ Licht",   unit: " lx",  color: "#ffa64d", attr: "illuminance",    min_attr: "min_illuminance",    max_attr: "max_illuminance"    },
  conductivity:   { label: "⚡ EC",      unit: " µS",  color: "#b07cff", attr: "conductivity",   min_attr: "min_conductivity",   max_attr: "max_conductivity"   },
  humidity:       { label: "💧 Luft",    unit: "%",    color: "#00bfff", attr: "humidity",       min_attr: "min_humidity",       max_attr: "max_humidity"       },
  dli:            { label: "🌞 DLI",     unit: " mol", color: "#ffdd57", attr: "dli",            min_attr: "min_dli",            max_attr: "max_dli"            },
};

const DEFAULT_BARS = ["moisture", "temperature", "illuminance", "conductivity"];

class FlowerCard extends HTMLElement {
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
      if (this._hass && this._config) this._update();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._initialized && this._config) this._update();
  }

  setConfig(config) {
    if (!config.entity) throw new Error("flower-card: 'entity' muss angegeben werden.");
    this._config = {
      entity:         config.entity,
      display_type:   config.display_type   || "full",
      battery_sensor: config.battery_sensor || null,
      hide_image:     config.hide_image     ?? false,
      hide_species:   config.hide_species   ?? false,
      show_bars:      config.show_bars      || DEFAULT_BARS,
      extra_badges:   config.extra_badges   || [],
    };
    if (this._initialized) this._update();
  }

  getCardSize() { return 4; }

  static getStubConfig() {
    return { entity: "plant.meine_pflanze" };
  }

  // GUI Editor
  static getConfigElement() {
    return document.createElement("flower-card-editor");
  }

  // -------------------------------------------------------------------
  // DOM aufbauen
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
            font-family: var(--primary-font-family, sans-serif);
            user-select: none;
          }
          /* HEADER */
          .fc-header {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 12px;
          }
          .fc-image {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(255,255,255,0.3);
            background: rgba(255,255,255,0.1);
            flex-shrink: 0;
          }
          .fc-image-placeholder {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
            border: 2px solid rgba(255,255,255,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            flex-shrink: 0;
          }
          .fc-header-info {
            flex: 1;
            min-width: 0;
          }
          .fc-name {
            font-size: 17px;
            font-weight: 700;
            letter-spacing: 0.3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .fc-species {
            font-size: 12px;
            opacity: 0.65;
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .fc-status {
            display: inline-block;
            font-size: 12px;
            font-weight: 600;
            opacity: 0.88;
            margin-top: 5px;
            padding: 2px 9px;
            border-radius: 20px;
            background: rgba(255,255,255,0.12);
          }
          /* BADGES */
          .fc-badges {
            display: flex;
            gap: 7px;
            align-items: center;
            flex-shrink: 0;
          }
          .fc-badge {
            display: flex;
            align-items: center;
            gap: 3px;
            background: rgba(255,255,255,0.12);
            border-radius: 20px;
            padding: 3px 8px;
            font-size: 12px;
            font-weight: 600;
          }
          .fc-battery {
            display: flex;
            align-items: center;
            gap: 3px;
            font-size: 12px;
            font-weight: 600;
          }
          /* BARS */
          .fc-divider {
            border: none;
            border-top: 1px solid rgba(255,255,255,0.12);
            margin: 12px 0 12px;
          }
          .fc-bars { text-align: left; }
          .fc-bars.compact {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0 16px;
          }
          .fc-row {
            display: grid;
            grid-template-columns: 78px 1fr 52px;
            align-items: center;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .fc-bars.compact .fc-row {
            grid-template-columns: 60px 1fr;
          }
          .fc-label { opacity: 0.78; white-space: nowrap; font-size: 12px; }
          .fc-val {
            text-align: right;
            font-weight: 700;
            font-size: 11px;
            opacity: 0.92;
          }
          .fc-bars.compact .fc-val { display: none; }
          .fc-bar-bg {
            height: 7px;
            background: rgba(255,255,255,0.18);
            border-radius: 10px;
            overflow: hidden;
            margin: 0 8px;
            position: relative;
          }
          .fc-bars.compact .fc-bar-bg { margin: 0 0 0 6px; }
          .fc-bar-fill {
            height: 100%;
            border-radius: 10px;
            transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
          }
          /* Warnschwellen Marker */
          .fc-bar-min, .fc-bar-max {
            position: absolute;
            top: 0;
            width: 2px;
            height: 100%;
            background: rgba(255,255,255,0.5);
            border-radius: 2px;
          }
          /* Compact header */
          .fc-wrap.compact .fc-image,
          .fc-wrap.compact .fc-image-placeholder { width: 40px; height: 40px; font-size: 20px; }
          .fc-wrap.compact .fc-name { font-size: 14px; }
          .fc-wrap.compact .fc-species { font-size: 11px; }
        </style>
        <div class="fc-wrap" id="fc-wrap">
          <!-- HEADER -->
          <div class="fc-header">
            <div id="fc-img-wrap">
              <div class="fc-image-placeholder">🌸</div>
            </div>
            <div class="fc-header-info">
              <div class="fc-name" id="fc-name">Pflanze</div>
              <div class="fc-species" id="fc-species"></div>
              <span class="fc-status" id="fc-status">⏳ Lade…</span>
            </div>
            <div class="fc-badges" id="fc-badges"></div>
          </div>
          <hr class="fc-divider">
          <div class="fc-bars" id="fc-bars"></div>
        </div>
      </ha-card>
    `;
  }

  // -------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------
  _update() {
    if (!this._hass || !this._config) return;

    const cfg = this._config;
    const state = this._hass.states[cfg.entity];

    if (!state) {
      this.querySelector("#fc-name").textContent = cfg.entity;
      this.querySelector("#fc-status").textContent = "⚠️ Entity nicht gefunden";
      return;
    }

    const attrs = state.attributes;
    const isCompact = cfg.display_type === "compact";

    // Compact Mode
    const wrap = this.querySelector("#fc-wrap");
    wrap.className = `fc-wrap${isCompact ? " compact" : ""}`;

    // Bild
    const imgWrap = this.querySelector("#fc-img-wrap");
    if (!cfg.hide_image && attrs.entity_picture) {
      imgWrap.innerHTML = `<img class="fc-image" src="${attrs.entity_picture}" alt="plant">`;
    } else {
      const icon = this._getIcon(attrs);
      imgWrap.innerHTML = `<div class="fc-image-placeholder">${icon}</div>`;
    }

    // Name & Species
    this.querySelector("#fc-name").textContent = attrs.friendly_name || cfg.entity;
    const speciesEl = this.querySelector("#fc-species");
    if (!cfg.hide_species && attrs.species) {
      speciesEl.textContent = attrs.species;
      speciesEl.style.display = "";
    } else {
      speciesEl.style.display = "none";
    }

    // Status
    const status = this._getStatus(attrs);
    this.querySelector("#fc-status").textContent = status;

    // Badges
    this._renderBadges(attrs);

    // Bars
    this._renderBars(attrs, isCompact);
  }

  _getIcon(attrs) {
    const moisture = parseFloat(attrs.moisture);
    if (isNaN(moisture)) return "❓";
    const min = parseFloat(attrs.min_moisture) || 30;
    const max = parseFloat(attrs.max_moisture) || 80;
    if (moisture < min) return "🥀";
    if (moisture < min + 10) return "🌼";
    if (moisture > max) return "💧";
    return "🌸";
  }

  _getStatus(attrs) {
    const checks = [
      { val: attrs.moisture,     min: attrs.min_moisture,     max: attrs.max_moisture,     low: "💧 Gießen empfohlen",        high: "🚨 Zu nass!" },
      { val: attrs.conductivity, min: attrs.min_conductivity, max: attrs.max_conductivity, low: "⚡ Düngen empfohlen",          high: "🚨 Zu viel Dünger!" },
      { val: attrs.temperature,  min: attrs.min_temperature,  max: attrs.max_temperature,  low: "🥶 Zu kalt!",                 high: "🔥 Zu warm!" },
      { val: attrs.illuminance,  min: attrs.min_illuminance,  max: attrs.max_illuminance,  low: "🌑 Zu dunkel!",               high: "☀️ Zu hell!" },
    ];
    for (const c of checks) {
      const v = parseFloat(c.val);
      if (isNaN(v)) continue;
      if (c.min && v < parseFloat(c.min)) return c.low;
      if (c.max && v > parseFloat(c.max)) return c.high;
    }
    return "🟢 Alles OK";
  }

  _renderBadges(attrs) {
    const cfg = this._config;
    let html = "";

    // Batterie
    if (cfg.battery_sensor) {
      const batState = this._hass.states[cfg.battery_sensor];
      if (batState) {
        const bat = parseFloat(batState.state);
        const color = bat >= 40 ? "#7CFC00" : bat >= 20 ? "#ffa64d" : "#ff4444";
        const icon = bat >= 40 ? "🔋" : bat >= 20 ? "🪫" : "🔴";
        html += `<span class="fc-battery" style="color:${color}">${icon} ${Math.round(bat)}%</span>`;
      }
    }

    // Extra Badges
    for (const badge of cfg.extra_badges) {
      const s = this._hass.states[badge.entity];
      if (!s) continue;
      const val = s.state;
      const unit = s.attributes.unit_of_measurement || "";
      html += `<span class="fc-badge">${val}${unit}</span>`;
    }

    this.querySelector("#fc-badges").innerHTML = html;
  }

  _renderBars(attrs, isCompact) {
    const cfg = this._config;
    const barsEl = this.querySelector("#fc-bars");
    barsEl.className = `fc-bars${isCompact ? " compact" : ""}`;

    const bars = cfg.show_bars
      .filter(key => BAR_CONFIG[key])
      .map(key => {
        const bc = BAR_CONFIG[key];
        const val = parseFloat(attrs[bc.attr]);
        const minVal = parseFloat(attrs[bc.min_attr]) || 0;
        const maxVal = parseFloat(attrs[bc.max_attr]) || 100;
        const pct = isNaN(val) ? 0 : Math.max(0, Math.min(100, (val / maxVal) * 100)).toFixed(1);
        const minPct = ((minVal / maxVal) * 100).toFixed(1);

        // Farbe je nach Status
        let color = bc.color;
        if (!isNaN(val)) {
          if (val < minVal) color = "#ff4444";
          else if (val > maxVal) color = "#ff4444";
        }

        return `
          <div class="fc-row">
            <div class="fc-label">${bc.label}</div>
            <div class="fc-bar-bg">
              <div class="fc-bar-fill" style="width:${pct}%;background:${color};"></div>
              <div class="fc-bar-min" style="left:${minPct}%;"></div>
            </div>
            <div class="fc-val">${isNaN(val) ? "–" : val}${isNaN(val) ? "" : bc.unit}</div>
          </div>
        `;
      });

    barsEl.innerHTML = bars.join("");
  }
}

// -------------------------------------------------------------------
// GUI EDITOR
// -------------------------------------------------------------------
class FlowerCardEditor extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this._config = {};
  }

  set hass(hass) {
    this._hass = hass;
  }

  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  _render() {
    if (!this._hass) return;

    // Alle Plant Entities
    const plants = Object.keys(this._hass.states)
      .filter(id => id.startsWith("plant."))
      .sort();

    // Alle Sensoren
    const sensors = Object.keys(this._hass.states)
      .filter(id => id.startsWith("sensor."))
      .sort();

    const cfg = this._config;

    this.innerHTML = `
      <style>
        .editor-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 14px;
        }
        .editor-label {
          font-size: 13px;
          font-weight: 600;
          opacity: 0.8;
        }
        .editor-select, .editor-input {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 13px;
          width: 100%;
          box-sizing: border-box;
        }
        .editor-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
        }
      </style>

      <div class="editor-row">
        <div class="editor-label">🌿 Plant Entity</div>
        <select class="editor-select" id="entity">
          ${plants.map(p => `<option value="${p}" ${cfg.entity === p ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </div>

      <div class="editor-row">
        <div class="editor-label">🖼️ Anzeigemodus</div>
        <select class="editor-select" id="display_type">
          <option value="full" ${(cfg.display_type||"full") === "full" ? "selected" : ""}>Full</option>
          <option value="compact" ${cfg.display_type === "compact" ? "selected" : ""}>Compact</option>
        </select>
      </div>

      <div class="editor-row">
        <div class="editor-label">🔋 Batterie Sensor (optional)</div>
        <select class="editor-select" id="battery_sensor">
          <option value="">– Kein Batterie Sensor –</option>
          ${sensors.map(s => `<option value="${s}" ${cfg.battery_sensor === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>

      <div class="editor-row">
        <div class="editor-label editor-toggle">
          <input type="checkbox" id="hide_image" ${cfg.hide_image ? "checked" : ""}>
          Pflanzenbild ausblenden
        </div>
      </div>

      <div class="editor-row">
        <div class="editor-label editor-toggle">
          <input type="checkbox" id="hide_species" ${cfg.hide_species ? "checked" : ""}>
          Pflanzenart ausblenden
        </div>
      </div>
    `;

    // Events
    this.querySelectorAll("select, input").forEach(el => {
      el.addEventListener("change", () => this._valueChanged());
    });
  }

  _valueChanged() {
    const newConfig = {
      ...this._config,
      entity:         this.querySelector("#entity").value,
      display_type:   this.querySelector("#display_type").value,
      battery_sensor: this.querySelector("#battery_sensor").value || null,
      hide_image:     this.querySelector("#hide_image").checked,
      hide_species:   this.querySelector("#hide_species").checked,
    };

    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define("flower-card", FlowerCard);
customElements.define("flower-card-editor", FlowerCardEditor);

console.info(
  `%c FLOWER-CARD %c v${VERSION} – Smart Home Tom `,
  "color:#fff;background:#7CFC00;font-weight:700;padding:2px 6px;border-radius:4px 0 0 4px;",
  "color:#7CFC00;background:#111;font-weight:500;padding:2px 6px;border-radius:0 4px 4px 0;"
);
