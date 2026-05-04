# 🌸 Flower Card – Smart Home Tom

Eine eigenständige Lovelace Custom Card für Home Assistant zur übersichtlichen Darstellung von Pflanzensensoren.

**Zeigt:** Bodenfeuchte · Temperatur · Lichtstärke · EC-Wert (Leitfähigkeit)  
**Design:** Glassmorphism · Farbige Balken · Status-Icon mit automatischer Bewertung  
**Keine Abhängigkeiten** – funktioniert ohne button-card oder andere Plugins!

---

## 📦 Installation via HACS (empfohlen)

1. HACS öffnen → **Frontend**
2. Drei-Punkte-Menü (oben rechts) → **Custom Repositories**
3. URL eingeben: `https://github.com/maler-tom/flower-card`
4. Kategorie: **Lovelace** → Add
5. Flower Card suchen → **Installieren**
6. Home Assistant neu laden (F5)

---

## ⚙️ Konfiguration

### Minimale Konfiguration

```yaml
type: custom:flower-card
plant_name: "Monstera"
soil: sensor.monstera_soil
temp: sensor.monstera_temp
lux: sensor.monstera_lux
ec: sensor.monstera_ec
```

### Alle Optionen

```yaml
type: custom:flower-card
plant_name: "Monstera Deliciosa"   # Anzeigename der Pflanze
soil: sensor.monstera_soil         # Bodenfeuchte-Sensor (%)
temp: sensor.monstera_temp         # Temperatur-Sensor (°C)
lux: sensor.monstera_lux           # Lichtsensor (lx)
ec: sensor.monstera_ec             # EC / Leitfähigkeit (µS)

# Optional: Maximale Skalierung der Balken
soil_max: 100        # Standard: 100
temp_max: 40         # Standard: 40
lux_max: 10000       # Standard: 10000
ec_max: 2000         # Standard: 2000

# Optional: Warnschwellen
soil_warn_low: 30    # Unter diesem Wert → "Gießen empfohlen" (Standard: 30)
soil_warn_high: 80   # Über diesem Wert → "Zu nass!" (Standard: 80)
ec_warn_low: 300     # Unter diesem Wert → "Düngen empfohlen" (Standard: 300)
ec_warn_high: 1200   # Über diesem Wert → "Zu viel Dünger!" (Standard: 1200)
```

---

## 📊 Status-Logik

| Zustand | Icon | Status |
|---|---|---|
| Bodenfeuchte < 30% | 🥀 | 💧 Gießen empfohlen |
| Bodenfeuchte 30–40% | 🌼 | ⚡ Düngen empfohlen (wenn EC < 300) |
| Bodenfeuchte 40–70% | 🌸 | 🟢 Alles OK |
| Bodenfeuchte > 70% | 💧 | 🟢 Alles OK |
| Bodenfeuchte > 80% | 💧 | 🚨 Zu nass! |
| EC > 1200 µS | – | 🚨 Zu viel Dünger! |

---

## 🛠️ Manuelle Installation (ohne HACS)

1. `flower-card.js` aus dem [neuesten Release](https://github.com/maler-tom/flower-card/releases) herunterladen
2. Datei in `/config/www/` kopieren
3. In HA: **Einstellungen → Dashboards → Ressourcen → Hinzufügen**
   - URL: `/local/flower-card.js`
   - Typ: JavaScript-Modul
4. HA neu laden

---

## 📝 Changelog

### v1.0.0
- Eigenständige JS Custom Card (keine button-card Abhängigkeit)
- Glassmorphism-Design
- Konfigurierbare Warnschwellen
- Sensor-Fehlerbehandlung (zeigt "–" wenn Sensor nicht verfügbar)
- HACS-kompatibel

---

*by [Smart Home Tom](https://github.com/maler-tom)*
