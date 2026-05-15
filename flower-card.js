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
 *   hide_species: false        # Pflanzenart ausblenden
 *   show_bars:                 # Welche Balken anzeigen
 *     - soil_moisture
 *     - temperature
 *     - illuminance
 *     - conductivity
 *     - air_humidity
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
// Balken Konfiguration
// -------------------------------------------------------------------
const BAR_CONFIG = {
  soil_moisture: { label: "🌱 Boden",  unit: "%",    color: "#7CFC00" },
  temperature:   { label: "🌡 Temp",   unit: "°C",   color: "#4db8ff" },
  illuminance:   { label: "☀️ Licht",  unit: " lx",  color: "#ffa64d" },
  conductivity:  { label: "⚡ EC",     unit: " µS",  color: "#b07cff" },
  air_humidity:  { label: "💧 Luft",   unit: "%",    color: "#00bfff" },
  ppfd_mol:      { label: "🌞 PPFD",   unit: " mol", color: "#ffdd57" },
};

const DEFAULT_BARS = ["soil_moisture", "temperature", "illuminance", "conductivity", "air_humidity"];

// -------------------------------------------------------------------
// Haupt Card
// -------------------------------------------------------------------
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
          .fc-icon {
            font-size: 2.8em;
            line-height: 1;
            flex-shrink: 0;
            transition: all 0.5s ease;
          }
          .fc-wrap.compact .fc-icon {
            font-size: 2em;
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
          .fc-wrap.compact .fc-name { font-size: 14px; }
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
            flex-direction: column;
            gap: 5px;
            align-items: flex-end;
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
            background: rgba(255,255,255,0.12);
            border-radius: 20px;
            padding: 3px 8px;
          }
          /* BARS */
          .fc-divider {
            border: none;
            border-top: 1px solid rgba(255,255,255,0.12);
            margin: 12px 0;
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
        </style>
        <div class="fc-wrap" id="fc-wrap">
          <div class="fc-header">
            <div class="fc-icon" id="fc-icon">🌸</div>
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
  // Sensor Entity ID aus Plant Entity ableiten
  // -------------------------------------------------------------------
  _getSensorId(plantId, suffix) {
    // plant.zwergh_blattfahn → sensor.zwergh_blattfahn_soil_moisture
    const name = plantId.replace("plant.", "");
    return `sensor.${name}_${suffix}`;
  }

  // -------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------
  _update() {
    if (!this._hass || !this._config) return;

    const cfg = this._config;
    const plantState = this._hass.states[cfg.entity];

    if (!plantState) {
      this.querySelector("#fc-name").textContent = cfg.entity;
      this.querySelector("#fc-status").textContent = "⚠️ Entity nicht gefunden";
      return;
    }

    const attrs = plantState.attributes;
    const isCompact = cfg.display_type === "compact";

    // Compact Mode
    this.querySelector("#fc-wrap").className = `fc-wrap${isCompact ? " compact" : ""}`;

    // Sensoren auslesen
    const sensors = {};
    for (const key of Object.keys(BAR_CONFIG)) {
      const entityId = this._getSensorId(cfg.entity, key);
      const state = this._hass.states[entityId];
      sensors[key] = state ? parseFloat(state.state) : null;
      // Min/Max aus Sensor Attributen
      if (state) {
        sensors[`${key}_min`] = parseFloat(state.attributes.min) || null;
        sensors[`${key}_max`] = parseFloat(state.attributes.max) || null;
      }
    }

    // Icon je nach Bodenfeuchtigkeit
    const moisture = sensors["soil_moisture"];
    let icon = "🌸";
    if (moisture === null || isNaN(moisture)) icon = "❓";
    else if (moisture < 20)  icon = "🥀";
    else if (moisture < 35)  icon = "🌼";
    else if (moisture > 80)  icon = "💧";
    else                     icon = "🌸";

    // Status
    let status = "🟢 Alles OK";
    const checks = [
      { key: "soil_moisture",  low: "💧 Gießen empfohlen",   high: "🚨 Zu nass!",         lowVal: 20, highVal: 80 },
      { key: "conductivity",   low: "⚡ Düngen empfohlen",   high: "🚨 Zu viel Dünger!",  lowVal: 100, highVal: 2000 },
      { key: "temperature",    low: "🥶 Zu kalt!",           high: "🔥 Zu warm!",          lowVal: 10, highVal: 35 },
      { key: "illuminance",    low: "🌑 Zu dunkel!",         high: "☀️ Zu hell!",          lowVal: 500, highVal: 50000 },
    ];

    for (const c of checks) {
      const v = sensors[c.key];
      if (v === null || isNaN(v)) continue;
      const min = sensors[`${c.key}_min`] || c.lowVal;
      const max = sensors[`${c.key}_max`] || c.highVal;
      if (v < min) { status = c.low; break; }
      if (v > max) { status = c.high; break; }
    }

    // DOM Updates
    this.querySelector("#fc-icon").textContent = icon;
    this.querySelector("#fc-name").textContent = attrs.friendly_name || cfg.entity;

    // Species
    const speciesEl = this.querySelector("#fc-species");
    if (!cfg.hide_species && attrs.species) {
      speciesEl.textContent = attrs.species;
      speciesEl.style.display = "";
    } else {
      speciesEl.style.display = "none";
    }

    this.querySelector("#fc-status").textContent = status;

    // Badges
    this._renderBadges();

    // Bars
    this._renderBars(sensors, isCompact);
  }

  _renderBadges() {
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
      const unit = s.attributes.unit_of_measurement || "";
      html += `<span class="fc-badge">${s.state}${unit}</span>`;
    }

    this.querySelector("#fc-badges").innerHTML = html;
  }

  _renderBars(sensors, isCompact) {
    const cfg = this._config;
    const barsEl = this.querySelector("#fc-bars");
    barsEl.className = `fc-bars${isCompact ? " compact" : ""}`;

    // Standardmäßige Max-Werte wenn keine Min/Max in Sensoren
    const defaults = {
      soil_moisture: { max: 100 },
      temperature:   { max: 40  },
      illuminance:   { max: 10000 },
      conductivity:  { max: 2000 },
      air_humidity:  { max: 100 },
      ppfd_mol:      { max: 100 },
    };

    barsEl.innerHTML = cfg.show_bars
      .filter(key => BAR_CONFIG[key])
      .map(key => {
        const bc = BAR_CONFIG[key];
        const val = sensors[key];
        const maxVal = sensors[`${key}_max`] || defaults[key]?.max || 100;
        const minVal = sensors[`${key}_min`] || 0;

        const pct = (val === null || isNaN(val))
          ? 0
          : Math.max(0, Math.min(100, (val / maxVal) * 100)).toFixed(1);

        // Balkenfarbe: rot wenn außerhalb Schwelle
        let color = bc.color;
        if (val !== null && !isNaN(val)) {
          if (val < minVal || val > maxVal) color = "#ff4444";
        }

        const displayVal = (val === null || isNaN(val)) ? "–" : val;
        const displayUnit = (val === null || isNaN(val)) ? "" : bc.unit;

        return `
          <div class="fc-row">
            <div class="fc-label">${bc.label}</div>
            <div class="fc-bar-bg">
              <div class="fc-bar-fill" style="width:${pct}%;background:${color};"></div>
            </div>
            <div class="fc-val">${displayVal}${displayUnit}</div>
          </div>
        `;
      }).join("");
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
    this._render();
  }

  setConfig(config) {
    this._config = config || {};
    this._render();
  }

  _render() {
    if (!this._hass) return;

    const plants = Object.keys(this._hass.states)
      .filter(id => id.startsWith("plant."))
      .sort();

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
        .editor-select {
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
          font-weight: normal;
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
          <option value="full"    ${(cfg.display_type || "full") === "full"    ? "selected" : ""}>Full</option>
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
        <label class="editor-toggle">
          <input type="checkbox" id="hide_species" ${cfg.hide_species ? "checked" : ""}>
          Pflanzenart ausblenden
        </label>
      </div>
    `;

    this.querySelectorAll("select, input").forEach(el => {
      el.addEventListener("change", () => this._valueChanged());
    });
  }

  _valueChanged() {
    const event = new CustomEvent("config-changed", {
      detail: {
        config: {
          ...this._config,
          entity:         this.querySelector("#entity").value,
          display_type:   this.querySelector("#display_type").value,
          battery_sensor: this.querySelector("#battery_sensor").value || null,
          hide_species:   this.querySelector("#hide_species").checked,
        }
      },
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
