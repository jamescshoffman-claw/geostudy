export interface Country {
  id: number
  name: string
  aliases?: string[]
  labelPos?: [number, number]   // override [lon, lat] when D3 centroid is off-screen
}

export interface SmallDef {
  id: number
  lon: number
  lat: number
  dx: number
  dy: number
}

export interface InsetCallout {
  id: number
  lon: number
  lat: number
  dx: number
  dy: number
  label: string
}

export interface InsetDef {
  label: string
  projCenter: [number, number]
  projScale: number
  ids: number[]
  callouts?: InsetCallout[]
}

export interface QuizConfig {
  label: string
  countries: Country[]
  smallDef: SmallDef[]
  total: number
  projCenter: [number, number]
  projScale: number
  projOffsetY?: number      // px to shift the rendered map vertically (+down / -up)
  timerSeconds?: number     // round length override (default TIMER_SECONDS = 600)
  regionLabel: string
  winMsg: string
  inset?: InsetDef
  // Optional overrides for non-country quizzes (e.g. US states).
  itemNoun?: string         // singular, e.g. 'state' (default 'country')
  itemNounPlural?: string   // plural, e.g. 'states' (default 'countries')
  projectionType?: 'mercator' | 'albersUsa'
  dataSource?: {
    url: string
    objectName: string      // key in TopoJSON `objects` (e.g. 'states')
  }
}

export type RegionKey = 'world' | 'europe' | 'africa' | 'northamerica' | 'southamerica' | 'asia' | 'oceania' | 'americanstates'

// ── Europe ────────────────────────────────────────────────────────────────────

const EUROPE: Country[] = [
  { id: 8,   name: 'Albania' },
  { id: 20,  name: 'Andorra' },
  { id: 40,  name: 'Austria' },
  { id: 112, name: 'Belarus' },
  { id: 56,  name: 'Belgium' },
  { id: 70,  name: 'Bosnia and Herzegovina', aliases: ['Bosnia', 'Bosnia & Herzegovina', 'Bosnia-Herzegovina'] },
  { id: 100, name: 'Bulgaria' },
  { id: 191, name: 'Croatia' },
  { id: 196, name: 'Cyprus' },
  { id: 203, name: 'Czechia',            aliases: ['Czech Republic'] },
  { id: 208, name: 'Denmark' },
  { id: 233, name: 'Estonia' },
  { id: 246, name: 'Finland' },
  { id: 250, name: 'France' },
  { id: 276, name: 'Germany' },
  { id: 300, name: 'Greece' },
  { id: 348, name: 'Hungary' },
  { id: 352, name: 'Iceland' },
  { id: 372, name: 'Ireland' },
  { id: 380, name: 'Italy' },
  { id: -99, name: 'Kosovo', labelPos: [21.0, 42.6] },
  { id: 428, name: 'Latvia' },
  { id: 438, name: 'Liechtenstein' },
  { id: 440, name: 'Lithuania' },
  { id: 442, name: 'Luxembourg' },
  { id: 470, name: 'Malta' },
  { id: 498, name: 'Moldova' },
  { id: 492, name: 'Monaco' },
  { id: 499, name: 'Montenegro' },
  { id: 528, name: 'Netherlands',        aliases: ['Holland', 'The Netherlands'] },
  { id: 807, name: 'North Macedonia',    aliases: ['Macedonia', 'FYR Macedonia'] },
  { id: 578, name: 'Norway', labelPos: [8, 62] },
  { id: 616, name: 'Poland' },
  { id: 620, name: 'Portugal' },
  { id: 642, name: 'Romania' },
  { id: 643, name: 'Russia' },
  { id: 674, name: 'San Marino' },
  { id: 688, name: 'Serbia' },
  { id: 703, name: 'Slovakia' },
  { id: 705, name: 'Slovenia' },
  { id: 724, name: 'Spain' },
  { id: 752, name: 'Sweden' },
  { id: 756, name: 'Switzerland' },
  { id: 792, name: 'Turkey' },
  { id: 804, name: 'Ukraine' },
  { id: 826, name: 'United Kingdom',     aliases: ['UK', 'Great Britain', 'England', 'Britain'] },
  { id: 336, name: 'Vatican City',       aliases: ['Vatican', 'Holy See'] },
]

const EUROPE_SMALL: SmallDef[] = [
  { id: 20,  lon: 1.58,  lat: 42.55, dx: -48, dy: -22 },
  { id: 438, lon: 9.55,  lat: 47.17, dx: -50, dy: -22 },
  { id: 470, lon: 14.37, lat: 35.90, dx:  50, dy:  22 },
  { id: 492, lon: 7.40,  lat: 43.74, dx:  50, dy: -22 },
  { id: 674, lon: 12.46, lat: 43.93, dx:  50, dy: -22 },
  { id: 336, lon: 12.45, lat: 41.90, dx:  50, dy:  22 },
]

// ── Africa ────────────────────────────────────────────────────────────────────

const AFRICA: Country[] = [
  { id: 12,  name: 'Algeria' },
  { id: 24,  name: 'Angola' },
  { id: 204, name: 'Benin' },
  { id: 72,  name: 'Botswana' },
  { id: 854, name: 'Burkina Faso' },
  { id: 108, name: 'Burundi' },
  { id: 132, name: 'Cabo Verde',                  aliases: ['Cape Verde'] },
  { id: 120, name: 'Cameroon' },
  { id: 140, name: 'Central African Republic',    aliases: ['CAR'] },
  { id: 148, name: 'Chad' },
  { id: 174, name: 'Comoros' },
  { id: 178, name: 'Republic of the Congo',       aliases: ['Congo', 'Congo-Brazzaville', 'Congo Republic'] },
  { id: 180, name: 'DR Congo',                    aliases: ['DRC', 'Democratic Republic of Congo', 'Democratic Republic of the Congo', 'Congo (DRC)'] },
  { id: 262, name: 'Djibouti' },
  { id: 818, name: 'Egypt' },
  { id: 226, name: 'Equatorial Guinea' },
  { id: 232, name: 'Eritrea' },
  { id: 748, name: 'Eswatini',                    aliases: ['Swaziland'] },
  { id: 231, name: 'Ethiopia' },
  { id: 266, name: 'Gabon' },
  { id: 270, name: 'Gambia',                      aliases: ['The Gambia'] },
  { id: 288, name: 'Ghana' },
  { id: 324, name: 'Guinea' },
  { id: 624, name: 'Guinea-Bissau' },
  { id: 384, name: 'Ivory Coast',                 aliases: ["Côte d'Ivoire", "Cote d'Ivoire", 'Cote d Ivoire'] },
  { id: 404, name: 'Kenya' },
  { id: 426, name: 'Lesotho' },
  { id: 430, name: 'Liberia' },
  { id: 434, name: 'Libya' },
  { id: 450, name: 'Madagascar' },
  { id: 454, name: 'Malawi' },
  { id: 466, name: 'Mali' },
  { id: 478, name: 'Mauritania' },
  { id: 480, name: 'Mauritius' },
  { id: 504, name: 'Morocco' },
  { id: 508, name: 'Mozambique' },
  { id: 516, name: 'Namibia' },
  { id: 562, name: 'Niger' },
  { id: 566, name: 'Nigeria' },
  { id: 646, name: 'Rwanda' },
  { id: 678, name: 'São Tomé and Príncipe',       aliases: ['Sao Tome and Principe', 'Sao Tome'] },
  { id: 686, name: 'Senegal' },
  { id: 690, name: 'Seychelles' },
  { id: 694, name: 'Sierra Leone' },
  { id: 706, name: 'Somalia' },
  { id: 710, name: 'South Africa' },
  { id: 728, name: 'South Sudan' },
  { id: 729, name: 'Sudan' },
  { id: 834, name: 'Tanzania' },
  { id: 768, name: 'Togo' },
  { id: 788, name: 'Tunisia' },
  { id: 800, name: 'Uganda' },
  { id: 894, name: 'Zambia' },
  { id: 716, name: 'Zimbabwe' },
]

const AFRICA_SMALL: SmallDef[] = [
  { id: 132, lon: -24.0, lat: 16.0, dx: -40, dy: -25 }, // Cabo Verde
  { id: 174, lon:  43.3, lat: -11.6, dx:  40, dy: -20 }, // Comoros
  { id: 480, lon:  57.5, lat: -20.3, dx:  40, dy:  15 }, // Mauritius
  { id: 678, lon:   6.7, lat:   0.2, dx: -40, dy: -25 }, // São Tomé and Príncipe
  { id: 690, lon:  55.5, lat:  -4.6, dx:  40, dy: -25 }, // Seychelles
]

// ── North America ─────────────────────────────────────────────────────────────

const NORTH_AMERICA: Country[] = [
  { id: 28,  name: 'Antigua and Barbuda',           aliases: ['Antigua'] },
  { id: 44,  name: 'Bahamas',                        aliases: ['The Bahamas'] },
  { id: 52,  name: 'Barbados' },
  { id: 84,  name: 'Belize' },
  { id: 124, name: 'Canada' },
  { id: 188, name: 'Costa Rica' },
  { id: 192, name: 'Cuba' },
  { id: 212, name: 'Dominica' },
  { id: 214, name: 'Dominican Republic' },
  { id: 222, name: 'El Salvador' },
  { id: 308, name: 'Grenada' },
  { id: 320, name: 'Guatemala' },
  { id: 332, name: 'Haiti' },
  { id: 340, name: 'Honduras' },
  { id: 388, name: 'Jamaica' },
  { id: 484, name: 'Mexico' },
  { id: 558, name: 'Nicaragua' },
  { id: 591, name: 'Panama' },
  { id: 659, name: 'Saint Kitts and Nevis',          aliases: ['St Kitts', 'St Kitts and Nevis'] },
  { id: 662, name: 'Saint Lucia',                    aliases: ['St Lucia'] },
  { id: 670, name: 'Saint Vincent and the Grenadines', aliases: ['Saint Vincent', 'St Vincent'] },
  { id: 780, name: 'Trinidad and Tobago',             aliases: ['Trinidad'] },
  { id: 840, name: 'United States',                  aliases: ['USA', 'US', 'America', 'United States of America'] },
]

const NORTH_AMERICA_SMALL: SmallDef[] = [
  { id: 44,  lon: -77.4, lat: 24.7, dx: -45, dy: -25 }, // Bahamas
  { id: 388, lon: -77.3, lat: 18.1, dx: -45, dy: -20 }, // Jamaica
]

// ── South America ─────────────────────────────────────────────────────────────

const SOUTH_AMERICA: Country[] = [
  { id: 32,  name: 'Argentina' },
  { id: 68,  name: 'Bolivia' },
  { id: 76,  name: 'Brazil',    aliases: ['Brasil'] },
  { id: 152, name: 'Chile' },
  { id: 170, name: 'Colombia' },
  { id: 218, name: 'Ecuador' },
  { id: 328, name: 'Guyana' },
  { id: 600, name: 'Paraguay' },
  { id: 604, name: 'Peru' },
  { id: 740, name: 'Suriname' },
  { id: 858, name: 'Uruguay' },
  { id: 862, name: 'Venezuela' },
]

// ── Asia ──────────────────────────────────────────────────────────────────────

const ASIA: Country[] = [
  { id: 4,   name: 'Afghanistan' },
  { id: 51,  name: 'Armenia' },
  { id: 31,  name: 'Azerbaijan' },
  { id: 48,  name: 'Bahrain' },
  { id: 50,  name: 'Bangladesh' },
  { id: 64,  name: 'Bhutan' },
  { id: 96,  name: 'Brunei',              aliases: ['Brunei Darussalam'] },
  { id: 116, name: 'Cambodia' },
  { id: 156, name: 'China' },
  { id: 268, name: 'Georgia' },
  { id: 356, name: 'India' },
  { id: 360, name: 'Indonesia' },
  { id: 364, name: 'Iran' },
  { id: 368, name: 'Iraq' },
  { id: 376, name: 'Israel' },
  { id: 392, name: 'Japan' },
  { id: 400, name: 'Jordan' },
  { id: 398, name: 'Kazakhstan' },
  { id: 414, name: 'Kuwait' },
  { id: 417, name: 'Kyrgyzstan' },
  { id: 418, name: 'Laos' },
  { id: 422, name: 'Lebanon' },
  { id: 458, name: 'Malaysia' },
  { id: 462, name: 'Maldives' },
  { id: 496, name: 'Mongolia' },
  { id: 104, name: 'Myanmar',             aliases: ['Burma'] },
  { id: 524, name: 'Nepal' },
  { id: 408, name: 'North Korea' },
  { id: 512, name: 'Oman' },
  { id: 586, name: 'Pakistan' },
  { id: 608, name: 'Philippines' },
  { id: 634, name: 'Qatar' },
  { id: 682, name: 'Saudi Arabia' },
  { id: 702, name: 'Singapore' },
  { id: 410, name: 'South Korea',         aliases: ['Korea'] },
  { id: 144, name: 'Sri Lanka',           aliases: ['Ceylon'] },
  { id: 760, name: 'Syria' },
  { id: 158, name: 'Taiwan' },
  { id: 762, name: 'Tajikistan' },
  { id: 764, name: 'Thailand' },
  { id: 626, name: 'Timor-Leste',         aliases: ['East Timor'] },
  { id: 792, name: 'Turkey' },
  { id: 795, name: 'Turkmenistan' },
  { id: 784, name: 'United Arab Emirates', aliases: ['UAE'] },
  { id: 860, name: 'Uzbekistan' },
  { id: 704, name: 'Vietnam',             aliases: ['Viet Nam'] },
  { id: 887, name: 'Yemen' },
]

const ASIA_SMALL: SmallDef[] = [
  { id: 48,  lon: 50.55,  lat: 26.00, dx:  55, dy: -25 },
  { id: 96,  lon: 114.83, lat:  4.94, dx:  50, dy: -28 },
  { id: 462, lon: 73.50,  lat:  4.00, dx: -55, dy: -20 },
  { id: 634, lon: 51.20,  lat: 25.30, dx:  55, dy:  25 },
  { id: 702, lon: 103.82, lat:  1.35, dx:  50, dy: -25 },
]

// ── Oceania ───────────────────────────────────────────────────────────────────

const OCEANIA: Country[] = [
  { id: 36,  name: 'Australia' },
  { id: 242, name: 'Fiji' },
  { id: 296, name: 'Kiribati' },
  { id: 584, name: 'Marshall Islands' },
  { id: 583, name: 'Micronesia',       aliases: ['Federated States of Micronesia', 'FSM'] },
  { id: 520, name: 'Nauru' },
  { id: 554, name: 'New Zealand' },
  { id: 585, name: 'Palau' },
  { id: 598, name: 'Papua New Guinea', aliases: ['PNG'] },
  { id: 882, name: 'Samoa',            aliases: ['Western Samoa'] },
  { id: 90,  name: 'Solomon Islands' },
  { id: 776, name: 'Tonga' },
  { id: 798, name: 'Tuvalu' },
  { id: 548, name: 'Vanuatu' },
]

const OCEANIA_SMALL: SmallDef[] = [
  { id: 296, lon: 173.0,  lat:   1.3, dx:  40, dy: -30 }, // Kiribati (Gilbert Islands)
  { id: 584, lon: 168.0,  lat:   7.1, dx:  40, dy: -25 }, // Marshall Islands
  { id: 583, lon: 158.2,  lat:   6.9, dx:  40, dy: -30 }, // Micronesia
  { id: 520, lon: 166.9,  lat:  -0.5, dx:  40, dy: -25 }, // Nauru
  { id: 585, lon: 134.5,  lat:   7.5, dx: -40, dy: -25 }, // Palau
  { id: 882, lon: -172.1, lat: -13.8, dx:  40, dy: -25 }, // Samoa
  { id: 776, lon: -175.2, lat: -21.2, dx:  40, dy:  20 }, // Tonga
  { id: 798, lon: 179.2,  lat:  -8.5, dx:  40, dy:  20 }, // Tuvalu
]

// ── American States ───────────────────────────────────────────────────────────
// IDs are numeric FIPS codes used by the us-atlas TopoJSON.

const STATES: Country[] = [
  { id: 1,  name: 'Alabama' },
  { id: 2,  name: 'Alaska' },
  { id: 4,  name: 'Arizona' },
  { id: 5,  name: 'Arkansas' },
  { id: 6,  name: 'California',     aliases: ['Cali'] },
  { id: 8,  name: 'Colorado' },
  { id: 9,  name: 'Connecticut' },
  { id: 10, name: 'Delaware' },
  { id: 12, name: 'Florida' },
  { id: 13, name: 'Georgia' },
  { id: 15, name: 'Hawaii' },
  { id: 16, name: 'Idaho' },
  { id: 17, name: 'Illinois' },
  { id: 18, name: 'Indiana' },
  { id: 19, name: 'Iowa' },
  { id: 20, name: 'Kansas' },
  { id: 21, name: 'Kentucky' },
  { id: 22, name: 'Louisiana' },
  { id: 23, name: 'Maine' },
  { id: 24, name: 'Maryland' },
  { id: 25, name: 'Massachusetts',  aliases: ['Mass'] },
  { id: 26, name: 'Michigan' },
  { id: 27, name: 'Minnesota' },
  { id: 28, name: 'Mississippi' },
  { id: 29, name: 'Missouri' },
  { id: 30, name: 'Montana' },
  { id: 31, name: 'Nebraska' },
  { id: 32, name: 'Nevada' },
  { id: 33, name: 'New Hampshire' },
  { id: 34, name: 'New Jersey' },
  { id: 35, name: 'New Mexico' },
  { id: 36, name: 'New York' },
  { id: 37, name: 'North Carolina' },
  { id: 38, name: 'North Dakota' },
  { id: 39, name: 'Ohio' },
  { id: 40, name: 'Oklahoma' },
  { id: 41, name: 'Oregon' },
  { id: 42, name: 'Pennsylvania',   aliases: ['Penn', 'Penna'] },
  { id: 44, name: 'Rhode Island' },
  { id: 45, name: 'South Carolina' },
  { id: 46, name: 'South Dakota' },
  { id: 47, name: 'Tennessee' },
  { id: 48, name: 'Texas' },
  { id: 49, name: 'Utah' },
  { id: 50, name: 'Vermont' },
  { id: 51, name: 'Virginia' },
  { id: 53, name: 'Washington' },
  { id: 54, name: 'West Virginia' },
  { id: 55, name: 'Wisconsin' },
  { id: 56, name: 'Wyoming' },
]

// Smallest states get callouts. Labels radiate east/south into the Atlantic.
const STATES_SMALL: SmallDef[] = [
  { id: 9,  lon: -72.7, lat: 41.6, dx: -60, dy:  20 }, // Connecticut
  { id: 44, lon: -71.5, lat: 41.7, dx:  70, dy:  -5 }, // Rhode Island
  { id: 34, lon: -74.5, lat: 40.2, dx:  90, dy:  15 }, // New Jersey
  { id: 10, lon: -75.5, lat: 39.0, dx: 100, dy:  35 }, // Delaware
]

// ── World ─────────────────────────────────────────────────────────────────────

const WORLD: Country[] = [
  ...EUROPE,
  ...AFRICA,
  ...NORTH_AMERICA,
  ...SOUTH_AMERICA,
  ...ASIA.filter(c => c.id !== 792), // Turkey already in EUROPE
  ...OCEANIA,
]

const WORLD_SMALL: SmallDef[] = [
  // European microstates
  { id: 20,  lon:  1.58, lat: 42.55, dx: -50, dy: -15 }, // Andorra
  { id: 438, lon:  9.55, lat: 47.17, dx: -45, dy: -30 }, // Liechtenstein
  { id: 470, lon: 14.37, lat: 35.90, dx:  45, dy:  30 }, // Malta
  { id: 492, lon:  7.40, lat: 43.74, dx:  30, dy: -35 }, // Monaco
  { id: 674, lon: 12.46, lat: 43.93, dx:  45, dy: -15 }, // San Marino
  { id: 336, lon: 12.45, lat: 41.90, dx:  45, dy:  15 }, // Vatican City
  // Caribbean (all too small to read at world scale)
  { id: 44,  lon: -77.40, lat: 24.70, dx: -45, dy: -20 }, // Bahamas
  { id: 192, lon: -79.50, lat: 21.50, dx: -50, dy:  22 }, // Cuba
  { id: 214, lon: -70.20, lat: 18.90, dx:  50, dy: -20 }, // Dominican Republic
  { id: 332, lon: -73.10, lat: 18.90, dx: -50, dy: -20 }, // Haiti
  { id: 388, lon: -77.30, lat: 18.10, dx:  45, dy:  15 }, // Jamaica
  { id: 28,  lon: -61.80, lat: 17.10, dx:  50, dy: -20 }, // Antigua and Barbuda
  { id: 52,  lon: -59.60, lat: 13.20, dx:  50, dy:  10 }, // Barbados
  { id: 212, lon: -61.40, lat: 15.40, dx: -50, dy:  -5 }, // Dominica
  { id: 308, lon: -61.70, lat: 12.10, dx: -45, dy:  25 }, // Grenada
  { id: 659, lon: -62.70, lat: 17.30, dx: -50, dy: -20 }, // Saint Kitts and Nevis
  { id: 662, lon: -60.90, lat: 13.90, dx:  50, dy:  -5 }, // Saint Lucia
  { id: 670, lon: -61.20, lat: 13.20, dx: -50, dy:  10 }, // Saint Vincent and the Grenadines
  { id: 780, lon: -61.20, lat: 10.50, dx:  45, dy:  25 }, // Trinidad and Tobago
  // African islands
  { id: 132, lon: -24.00, lat: 16.00, dx: -40, dy: -20 }, // Cabo Verde
  { id: 174, lon:  43.30, lat: -11.6, dx:  40, dy: -20 }, // Comoros
  { id: 480, lon:  57.50, lat: -20.3, dx:  40, dy:  15 }, // Mauritius
  { id: 678, lon:   6.70, lat:   0.2, dx: -40, dy:  25 }, // São Tomé and Príncipe
  { id: 690, lon:  55.50, lat:  -4.6, dx:  40, dy: -25 }, // Seychelles
  // Middle East / Gulf small states
  { id: 48,  lon:  50.55, lat: 26.00, dx:  40, dy: -22 }, // Bahrain
  { id: 414, lon:  47.70, lat: 29.30, dx: -40, dy: -22 }, // Kuwait
  { id: 422, lon:  35.90, lat: 34.00, dx: -40, dy: -22 }, // Lebanon
  { id: 634, lon:  51.20, lat: 25.30, dx:  40, dy:  25 }, // Qatar
  // Asian small states
  { id: 96,  lon: 114.83, lat:  4.94, dx:  40, dy: -25 }, // Brunei
  { id: 462, lon:  73.50, lat:  4.00, dx: -40, dy:  15 }, // Maldives
  { id: 702, lon: 103.82, lat:  1.35, dx:  40, dy: -22 }, // Singapore
  { id: 626, lon: 125.70, lat: -8.80, dx:  40, dy: -22 }, // Timor-Leste
  // Pacific island nations
  { id: 296, lon: 173.00, lat:  1.30, dx:  35, dy: -25 }, // Kiribati
  { id: 584, lon: 168.00, lat:  7.10, dx:  35, dy: -20 }, // Marshall Islands
  { id: 583, lon: 158.20, lat:  6.90, dx: -35, dy: -25 }, // Micronesia
  { id: 520, lon: 166.90, lat: -0.50, dx:  35, dy:  15 }, // Nauru
  { id: 585, lon: 134.50, lat:  7.50, dx: -35, dy: -20 }, // Palau
  { id: 882, lon:-172.10, lat:-13.80, dx:  35, dy: -20 }, // Samoa
  { id: 776, lon:-175.20, lat:-21.20, dx:  35, dy:  20 }, // Tonga
  { id: 798, lon: 179.20, lat: -8.50, dx:  35, dy:  20 }, // Tuvalu
]

// ── Configs ───────────────────────────────────────────────────────────────────

export const CONFIGS: Record<RegionKey, QuizConfig> = {
  world: {
    label: 'World',
    countries: WORLD,
    smallDef: WORLD_SMALL,
    total: 196,
    projCenter: [10, 15],
    projScale: 150,
    timerSeconds: 1200, // 20 minutes — the whole world is a lot to name
    regionLabel: 'recognized',
    winMsg: '🎉 You named all 196 countries of the world!',
  },
  europe: {
    label: 'Europe',
    countries: EUROPE,
    smallDef: EUROPE_SMALL,
    total: 47,
    projCenter: [15, 53],
    projScale: 600,
    regionLabel: 'European',
    winMsg: '🎉 You named all 47 countries of Europe!',
  },
  africa: {
    label: 'Africa',
    countries: AFRICA,
    smallDef: AFRICA_SMALL,
    total: 54,
    projCenter: [20, 2],
    projScale: 380,
    regionLabel: 'African',
    winMsg: '🎉 You named all 54 countries of Africa!',
  },
  northamerica: {
    label: 'North America',
    countries: NORTH_AMERICA,
    smallDef: NORTH_AMERICA_SMALL,
    total: 23,
    projCenter: [-90, 35],
    projScale: 340,
    regionLabel: 'North American',
    winMsg: '🎉 You named all 23 countries of North America!',
    inset: {
      label: 'Eastern Caribbean',
      projCenter: [-61.2, 13.8],
      projScale: 4000,
      ids: [28, 52, 212, 308, 659, 662, 670, 780],
      callouts: [
        { id: 659, lon: -62.7, lat: 17.3, dx: -70, dy: -12, label: 'St. Kitts & Nevis' },
        { id: 28,  lon: -61.8, lat: 17.1, dx:  70, dy: -12, label: 'Antigua & Barbuda' },
        { id: 212, lon: -61.4, lat: 15.4, dx: -70, dy:   0, label: 'Dominica' },
        { id: 662, lon: -60.9, lat: 13.9, dx:  70, dy:   0, label: 'Saint Lucia' },
        { id: 670, lon: -61.2, lat: 13.2, dx: -70, dy:  12, label: 'St. Vincent' },
        { id: 52,  lon: -59.6, lat: 13.2, dx:  70, dy:  12, label: 'Barbados' },
        { id: 308, lon: -61.7, lat: 12.1, dx: -70, dy:  24, label: 'Grenada' },
        { id: 780, lon: -61.2, lat: 10.5, dx:  70, dy:  24, label: 'Trinidad & Tobago' },
      ],
    },
  },
  southamerica: {
    label: 'South America',
    countries: SOUTH_AMERICA,
    smallDef: [],
    total: 12,
    projCenter: [-58, -18],
    projScale: 400,
    projOffsetY: -30, // shift up so the southern tip (Chile/Argentina) isn't clipped
    regionLabel: 'South American',
    winMsg: '🎉 You named all 12 countries of South America!',
  },
  asia: {
    label: 'Asia',
    countries: ASIA,
    smallDef: ASIA_SMALL,
    total: 47,
    projCenter: [88, 30],
    projScale: 360,
    regionLabel: 'Asian',
    winMsg: '🎉 You named all 47 countries of Asia!',
  },
  oceania: {
    label: 'Oceania',
    countries: OCEANIA,
    smallDef: OCEANIA_SMALL,
    total: 14,
    projCenter: [155, -20],
    projScale: 350,
    regionLabel: 'Oceanian',
    winMsg: '🎉 You named all 14 countries of Oceania!',
  },
  americanstates: {
    label: 'American States',
    countries: STATES,
    smallDef: STATES_SMALL,
    total: 50,
    projCenter: [0, 0], // unused by geoAlbersUsa
    projScale: 1100,
    regionLabel: 'American',
    winMsg: '🎉 You named all 50 American states!',
    itemNoun: 'state',
    itemNounPlural: 'states',
    projectionType: 'albersUsa',
    dataSource: {
      url: 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
      objectName: 'states',
    },
  },
}
