export const COLLECTIONS = [
  {
    "title": "Cat6 & Cat5e Ethernet Cable",
    "handle": "cat6-ethernet-cable",
    "description": "UTP and shielded Cat6, Cat6A, and Cat5e bulk cable spools and keystone jacks for structured cabling installations. Suitable for office, data center, and industrial network infrastructure.",
    "parentCategory": "Low Voltage & Data"
  },
  {
    "title": "Coaxial & AV Cable",
    "handle": "coax-av-cable",
    "description": "RG6, RG11 coaxial cable, HDMI, speaker wire, and security cable for audio/video distribution and residential or commercial AV installations.",
    "parentCategory": "Low Voltage & Data"
  },
  {
    "title": "Fiber Optic Cable & Accessories",
    "handle": "fiber-optic-cable",
    "description": "Single-mode and multimode fiber optic cable, patch cords, pigtails, and splice closures for high-bandwidth backbone and inter-building network runs.",
    "parentCategory": "Low Voltage & Data"
  },
  {
    "title": "Patch Panels & Keystones",
    "handle": "patch-panels-keystones",
    "description": "19-inch rackmount patch panels, angled face panels, blank keystone inserts, and cable management shelves for structured cabling termination and organization.",
    "parentCategory": "Low Voltage & Data"
  },
  {
    "title": "Security & Access Control Cable",
    "handle": "security-access-cable",
    "description": "Alarm, CCTV, access control, and landscape cable for security system wiring, surveillance camera runs, and outdoor low-voltage applications.",
    "parentCategory": "Low Voltage & Data"
  },
  {
    "title": "Power Distribution Units & Strips",
    "handle": "pdus-power-strips",
    "description": "Rackmount PDUs, industrial power strips, and heavy-duty extension cords for data center, server room, and commercial power distribution.",
    "parentCategory": "Power Distribution"
  },
  {
    "title": "Surge Protectors & UPS",
    "handle": "surge-protectors-ups",
    "description": "Whole-house surge protectors, rack-mount and tower UPS systems, point-of-use surge strips, and outdoor GFCI covers for equipment protection and backup power.",
    "parentCategory": "Power Distribution"
  }
] as const;

export const PRODUCTS = [
  {
    "title": "Cat6 UTP Bulk Cable 1000ft Spool — Blue",
    "vendor": "Southwire",
    "collection": "cat6-ethernet-cable",
    "sku": "CAT6-UTP-1000-BLU",
    "price": "89.99",
    "compareAtPrice": "109.99",
    "uom": "SPOOL",
    "descriptionHtml": "<p>Southwire 23 AWG solid bare copper Cat6 UTP cable rated for 550 MHz performance and backwards compatible with Cat5e infrastructure. Meets ANSI/TIA-568-C.2 specifications and is suitable for horizontal runs in commercial and enterprise structured cabling. CM rated jacket in blue for easy network identification.</p>",
    "tags": [
      "cat6-ethernet-cable",
      "b2b-demo",
      "sale",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 89.99
      },
      {
        "minQty": 10,
        "unitPrice": 84.99
      },
      {
        "minQty": 50,
        "unitPrice": 79.99
      }
    ]
  },
  {
    "title": "Cat6 UTP Bulk Cable 500ft Spool — Grey",
    "vendor": "Belden",
    "collection": "cat6-ethernet-cable",
    "sku": "CAT6-UTP-500-GRY",
    "price": "52.50",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Belden 23 AWG solid copper Cat6 cable in a 500ft pull-box spool ideal for mid-size runs and patch closet installations. Rated to 550 MHz with an ANSI/TIA-568-C.2-compliant grey CM jacket. Spline separator maintains pair geometry for consistent crosstalk performance.</p>",
    "tags": [
      "cat6-ethernet-cable",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "Cat6A Shielded F/UTP Bulk Cable 1000ft Spool",
    "vendor": "Belden",
    "collection": "cat6-ethernet-cable",
    "sku": "CAT6A-FUTP-1000-BLK",
    "price": "284.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Belden Cat6A F/UTP shielded bulk cable supports 10GBase-T at 500 MHz over 100m channel lengths per ANSI/TIA-568-C.2-1. The foil overall shield reduces alien crosstalk in high-density cable trays and plenum environments. 23 AWG solid conductors with a black CMR-rated riser jacket.</p>",
    "tags": [
      "cat6-ethernet-cable",
      "b2b-demo",
      "new"
    ],
    "pricingTiers": null
  },
  {
    "title": "Cat5e UTP Bulk Cable 1000ft Spool — Blue",
    "vendor": "Southwire",
    "collection": "cat6-ethernet-cable",
    "sku": "CAT5E-UTP-1000-BLU",
    "price": "64.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Southwire Cat5e 24 AWG solid bare copper UTP cable rated to 350 MHz and suitable for 1000Base-T Gigabit Ethernet per TIA-568-C.2. Ideal for cost-effective horizontal and backbone cabling in retrofit and new construction projects. Blue CM-rated PVC jacket with sequential footage markings.</p>",
    "tags": [
      "cat6-ethernet-cable",
      "b2b-demo",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 64.99
      },
      {
        "minQty": 10,
        "unitPrice": 60.99
      },
      {
        "minQty": 50,
        "unitPrice": 57.99
      }
    ]
  },
  {
    "title": "Cat6 Plenum CMP Bulk Cable 1000ft Spool — White",
    "vendor": "Panduit",
    "collection": "cat6-ethernet-cable",
    "sku": "CAT6-CMP-1000-WHT",
    "price": "189.99",
    "compareAtPrice": "219.99",
    "uom": "SPOOL",
    "descriptionHtml": "<p>Panduit 23 AWG Cat6 plenum-rated CMP cable meets NEC Article 800 requirements for air-handling plenum spaces and open-ceiling environments. Supports 550 MHz performance and passes ANSI/TIA-568-C.2 channel and component testing. Low-smoke, zero-halogen PVC compound reduces toxic fume generation in case of fire.</p>",
    "tags": [
      "cat6-ethernet-cable",
      "b2b-demo",
      "sale"
    ],
    "pricingTiers": null
  },
  {
    "title": "RJ45 Cat6 Keystone Jack — 25-Pack",
    "vendor": "Leviton",
    "collection": "cat6-ethernet-cable",
    "sku": "KJ-RJ45-CAT6-25PK",
    "price": "74.99",
    "compareAtPrice": null,
    "uom": "PK",
    "descriptionHtml": "<p>Leviton eXtreme Cat6 keystone jacks terminate 22–24 AWG solid or stranded conductors with T568A/B wiring options and tool-less 110 IDC termination. Rated to 550 MHz and backward compatible with Cat5e patch panels and faceplates. Pack of 25 in ivory finish fits any standard keystone faceplate or surface mount box.</p>",
    "tags": [
      "cat6-ethernet-cable",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "RG6 Coaxial Cable 500ft Spool — Black",
    "vendor": "Southwire",
    "collection": "coax-av-cable",
    "sku": "COAX-RG6-500-BLK",
    "price": "49.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Southwire RG6/U quad-shield coaxial cable with 18 AWG solid copper-clad steel center conductor and 75-ohm impedance for satellite, cable TV, and antenna distribution. 500ft bulk spool with black CMR-rated jacket is suitable for interior wall fish and conduit runs. Quad-shield construction provides superior rejection of RF interference in noisy environments.</p>",
    "tags": [
      "coax-av-cable",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "RG11 Coaxial Cable 500ft Spool — Black",
    "vendor": "Belden",
    "collection": "coax-av-cable",
    "sku": "COAX-RG11-500-BLK",
    "price": "144.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Belden RG11/U 14 AWG solid copper-clad steel center conductor coax cable rated for long-distance signal distribution up to 300ft with minimal signal loss. 75-ohm impedance, dual-shield construction, and sweep-tested to 3 GHz for satellite and CATV headend applications. Black CMR-rated jacket on a 500ft pull spool.</p>",
    "tags": [
      "coax-av-cable",
      "b2b-demo",
      "new"
    ],
    "pricingTiers": null
  },
  {
    "title": "High-Speed HDMI Cable 25ft — In-Wall CL3 Rated",
    "vendor": "Southwire",
    "collection": "coax-av-cable",
    "sku": "HDMI-CL3-25FT",
    "price": "34.99",
    "compareAtPrice": "44.99",
    "uom": "EA",
    "descriptionHtml": "<p>Southwire 25ft High-Speed HDMI 2.0 cable supports 4K at 60Hz, HDR, and 18 Gbps bandwidth for commercial display and AV integration projects. CL3 in-wall rated jacket allows in-wall installation without conduit per NEC Article 820. Gold-plated connectors with triple shielding ensure reliable signal integrity over the full cable length.</p>",
    "tags": [
      "coax-av-cable",
      "b2b-demo",
      "sale"
    ],
    "pricingTiers": null
  },
  {
    "title": "18/2 Speaker Wire 500ft Spool — White CL2",
    "vendor": "Southwire",
    "collection": "coax-av-cable",
    "sku": "SPK-18-2-500-WHT",
    "price": "54.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Southwire 18 AWG 2-conductor stranded bare copper speaker wire rated CL2 for in-wall audio distribution in residential and commercial installations. 500ft white jacket spool with sequential footage markings and polarity stripe for easy identification. Suitable for 4-ohm to 16-ohm speaker loads in distributed audio systems.</p>",
    "tags": [
      "coax-av-cable",
      "b2b-demo",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 54.99
      },
      {
        "minQty": 10,
        "unitPrice": 51.49
      },
      {
        "minQty": 50,
        "unitPrice": 48.99
      }
    ]
  },
  {
    "title": "14/4 Shielded Security Cable 500ft Spool",
    "vendor": "Belden",
    "collection": "coax-av-cable",
    "sku": "SEC-14-4-SHD-500",
    "price": "97.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Belden 14 AWG 4-conductor shielded security cable with 100% foil shield and drain wire for noise-free access control, intercom, and alarm panel wiring. CM-rated PVC jacket, 500ft spool with sequential markings. Stranded conductors provide flexibility for conduit pulls and cabinet terminations.</p>",
    "tags": [
      "coax-av-cable",
      "b2b-demo",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 97.99
      },
      {
        "minQty": 10,
        "unitPrice": 91.99
      },
      {
        "minQty": 50,
        "unitPrice": 86.99
      }
    ]
  },
  {
    "title": "OS2 Single-Mode Fiber Cable 6-Strand 1000ft",
    "vendor": "Belden",
    "collection": "fiber-optic-cable",
    "sku": "FIB-OS2-6ST-1000",
    "price": "384.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Belden OS2 9/125µm single-mode 6-strand loose-tube gel-filled fiber cable rated for outdoor and indoor/outdoor riser (OSP) use with a black LSZH jacket. Supports 10G, 40G, and 100G Ethernet over distances up to 10km per IEEE 802.3. Individually color-coded fibers in a single buffer tube with aramid yarn strength members.</p>",
    "tags": [
      "fiber-optic-cable",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "OM3 Multimode Fiber Cable 6-Strand 500ft",
    "vendor": "Panduit",
    "collection": "fiber-optic-cable",
    "sku": "FIB-OM3-6ST-500",
    "price": "224.99",
    "compareAtPrice": "259.99",
    "uom": "SPOOL",
    "descriptionHtml": "<p>Panduit OM3 50/125µm laser-optimized multimode 6-strand tight-buffer indoor fiber cable supports 10GBase-SR up to 300m and 40/100G applications per IEEE 802.3. Aqua OFNR-rated riser jacket complies with NEC Article 770 for vertical risers and general building use. Color-coded buffer tubes with sequential length markings.</p>",
    "tags": [
      "fiber-optic-cable",
      "b2b-demo",
      "sale"
    ],
    "pricingTiers": null
  },
  {
    "title": "SC/LC Fiber Pigtail — 12-Pack OS2 Single-Mode",
    "vendor": "3M",
    "collection": "fiber-optic-cable",
    "sku": "FIB-PGTL-SCLC-OS2-12",
    "price": "89.99",
    "compareAtPrice": null,
    "uom": "PK",
    "descriptionHtml": "<p>3M OS2 single-mode SC/LC fiber pigtails with factory-polished APC connectors and 0.9mm tight-buffer 1-meter leads for splice tray terminations in patch panels and splice closures. Insertion loss less than 0.3 dB per connector, return loss greater than 55 dB. Pack of 12 pigtails, 6 SC and 6 LC, individually packaged.</p>",
    "tags": [
      "fiber-optic-cable",
      "b2b-demo",
      "new"
    ],
    "pricingTiers": null
  },
  {
    "title": "LC/LC Duplex Patch Cable 3ft — OM3 Multimode",
    "vendor": "Panduit",
    "collection": "fiber-optic-cable",
    "sku": "FIB-PATCH-LCLC-OM3-3FT",
    "price": "18.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Panduit 3ft LC/LC duplex OM3 multimode patch cord with aqua 2mm zipcord jacket and UPC-polished connectors providing less than 0.2 dB insertion loss. Supports 10GBase-SR, 40GBase-SR4, and 100GBase-SR10 switch-to-panel connections in data center and MDF/IDF environments. Latch-guard boot protects connector release tab during dense-pack installations.</p>",
    "tags": [
      "fiber-optic-cable",
      "b2b-demo",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 18.99
      },
      {
        "minQty": 10,
        "unitPrice": 17.49
      },
      {
        "minQty": 50,
        "unitPrice": 15.99
      }
    ]
  },
  {
    "title": "Fiber Optic Dome Splice Closure",
    "vendor": "3M",
    "collection": "fiber-optic-cable",
    "sku": "FIB-SPLICE-DOME-EA",
    "price": "64.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>3M Fibrlok dome-style fiber splice closure accommodates up to 24 single-mode or multimode fusion or mechanical splices in up to 3 splice trays. Weatherproof IP68-rated enclosure rated for direct burial, aerial, or pedestal mounting. Gel-sealed port entries prevent moisture ingress in outdoor OSP applications.</p>",
    "tags": [
      "fiber-optic-cable",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "24-Port Cat6 Patch Panel — 1U Rackmount",
    "vendor": "Panduit",
    "collection": "patch-panels-keystones",
    "sku": "PP-CAT6-24PT-1U",
    "price": "64.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Panduit 24-port Cat6 patch panel with 110-style IDC rear termination supporting T568A/B wiring and rated to 550 MHz per ANSI/TIA-568-C.2. 1U 19-inch rackmount steel frame includes rear cable manager bar and numbered port labels. Pre-loaded with 24 Cat6 keystone-compatible ports and color-coded label windows.</p>",
    "tags": [
      "patch-panels-keystones",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "48-Port Cat6 Patch Panel — 2U Rackmount",
    "vendor": "Panduit",
    "collection": "patch-panels-keystones",
    "sku": "PP-CAT6-48PT-2U",
    "price": "129.99",
    "compareAtPrice": "149.99",
    "uom": "EA",
    "descriptionHtml": "<p>Panduit 48-port Cat6 2U rackmount patch panel doubles port density compared to 1U panels and is rated 550 MHz for Gigabit and 10GBase-T applications. Heavy-gauge steel chassis with rear strain-relief bar, sequential port numbering, and removable label windows for circuit identification. Supports T568A/B 110 IDC rear termination on all 48 ports.</p>",
    "tags": [
      "patch-panels-keystones",
      "b2b-demo",
      "sale",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 129.99
      },
      {
        "minQty": 10,
        "unitPrice": 121.99
      },
      {
        "minQty": 50,
        "unitPrice": 114.99
      }
    ]
  },
  {
    "title": "24-Port Angled Face Cat6 Patch Panel — 1U",
    "vendor": "Leviton",
    "collection": "patch-panels-keystones",
    "sku": "PP-CAT6-24PT-ANG-1U",
    "price": "89.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Leviton eXtreme 24-port angled-face Cat6 patch panel positions ports at a 45-degree angle to reduce patch cord bend radius and improve front-of-rack cable management in high-density MDF/IDF installations. Rated 550 MHz per TIA-568-C.2 with 110 IDC rear termination and T568A/B compatibility. 1U 19-inch steel chassis with integrated label holders.</p>",
    "tags": [
      "patch-panels-keystones",
      "b2b-demo",
      "new"
    ],
    "pricingTiers": null
  },
  {
    "title": "Keystone Blank Insert — 25-Pack",
    "vendor": "Leviton",
    "collection": "patch-panels-keystones",
    "sku": "KJ-BLANK-25PK-IVY",
    "price": "12.99",
    "compareAtPrice": null,
    "uom": "PK",
    "descriptionHtml": "<p>Leviton blank keystone inserts snap into any standard 568-type keystone faceplate or patch panel port to block unused openings and prevent dust and cable intrusion. Ivory finish matches standard wall plates and modular furniture faceplates. Pack of 25 snap-in blank inserts with tool-less installation.</p>",
    "tags": [
      "patch-panels-keystones",
      "b2b-demo",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 12.99
      },
      {
        "minQty": 10,
        "unitPrice": 12.19
      },
      {
        "minQty": 50,
        "unitPrice": 11.49
      }
    ]
  },
  {
    "title": "2U Rackmount Patch Panel Cable Management Shelf",
    "vendor": "Panduit",
    "collection": "patch-panels-keystones",
    "sku": "PP-SHELF-2U-CABLE",
    "price": "52.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Panduit 2U 19-inch rackmount cable management shelf with 10-inch depth provides a dedicated horizontal run space for patch cord dressing above or below patch panels. Integrated cable routing fingers and snap-on cover maintain bend radius compliance and improve rack airflow. Adjustable mounting brackets fit 19-inch EIA-310 racks and two-post open frames.</p>",
    "tags": [
      "patch-panels-keystones",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "22/4 Unshielded Alarm Cable 500ft Spool",
    "vendor": "Southwire",
    "collection": "security-access-cable",
    "sku": "SEC-22-4-UNS-500",
    "price": "44.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Southwire 22 AWG 4-conductor stranded copper unshielded alarm cable rated CMR for riser use in fire alarm, burglary, and access control panel wiring. 500ft white PVC jacket spool with sequential footage markers for accurate cut lengths. Meets UL 444 and ANSI/ICEA S-90-661 standards for indoor security system wiring.</p>",
    "tags": [
      "security-access-cable",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "18/4 Shielded CCTV Cable 500ft Spool",
    "vendor": "Belden",
    "collection": "security-access-cable",
    "sku": "SEC-18-4-SHD-CCTV-500",
    "price": "94.99",
    "compareAtPrice": "109.99",
    "uom": "SPOOL",
    "descriptionHtml": "<p>Belden 18 AWG 4-conductor shielded cable with 100% aluminum foil shield and stranded drain wire for PTZ CCTV camera power and control wiring. The CM-rated PVC jacket resists UV and moisture for in-wall or conduit installation in commercial surveillance systems. 500ft spool with footage markings; rated 300V RMS for camera power runs up to 500ft.</p>",
    "tags": [
      "security-access-cable",
      "b2b-demo",
      "sale"
    ],
    "pricingTiers": null
  },
  {
    "title": "22/6 Access Control Cable 500ft Spool — Shielded",
    "vendor": "Belden",
    "collection": "security-access-cable",
    "sku": "SEC-22-6-SHD-ACC-500",
    "price": "109.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Belden 22 AWG 6-conductor shielded cable designed for card reader, door controller, REX sensor, and electric lock wiring in enterprise access control systems. Foil shield with drain wire provides immunity from electromagnetic interference generated by elevator motors and HVAC equipment. CMR riser-rated PVC jacket on a 500ft spool.</p>",
    "tags": [
      "security-access-cable",
      "b2b-demo",
      "new",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 109.99
      },
      {
        "minQty": 10,
        "unitPrice": 102.99
      },
      {
        "minQty": 50,
        "unitPrice": 96.99
      }
    ]
  },
  {
    "title": "12/2 Speaker Cable Plenum 500ft Spool — White",
    "vendor": "Southwire",
    "collection": "security-access-cable",
    "sku": "SEC-12-2-PLN-SPK-500",
    "price": "154.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Southwire 12 AWG 2-conductor plenum-rated CL3P speaker cable supports high-power distributed audio systems in air-handling spaces per NEC Article 725. Low-smoke, fire-retardant jacket meets UL 910 Steiner tunnel test requirements for plenum installations without conduit. 500ft white spool with polarity stripe and sequential footage markings.</p>",
    "tags": [
      "security-access-cable",
      "b2b-demo",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 154.99
      },
      {
        "minQty": 10,
        "unitPrice": 144.99
      },
      {
        "minQty": 50,
        "unitPrice": 136.99
      }
    ]
  },
  {
    "title": "16/2 Landscape Low-Voltage Cable 250ft Spool",
    "vendor": "Southwire",
    "collection": "security-access-cable",
    "sku": "SEC-16-2-LNDSC-250",
    "price": "34.99",
    "compareAtPrice": null,
    "uom": "SPOOL",
    "descriptionHtml": "<p>Southwire 16 AWG 2-conductor direct-burial landscape cable rated for outdoor low-voltage lighting and irrigation control wiring. UV-resistant black PE jacket withstands direct burial, conduit, and above-ground exposure in residential and commercial landscape installations. 250ft spool supports transformer runs up to 150ft for 12V landscape lighting zones.</p>",
    "tags": [
      "security-access-cable",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "8-Outlet Rackmount PDU 15A 120V — 1U",
    "vendor": "Eaton",
    "collection": "pdus-power-strips",
    "sku": "PDU-8OUT-15A-1U",
    "price": "74.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Eaton 1U horizontal rackmount PDU with 8 NEMA 5-15R outlets, 15A circuit breaker, and 6ft 5-15P input cord for basic server rack power distribution. UL 60950-1 listed and meets IEC 60884 outlet spacing requirements for dense rack environments. Steel chassis with mounting brackets fits 19-inch EIA-310 two-post and four-post racks.</p>",
    "tags": [
      "pdus-power-strips",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "20A Horizontal PDU 12-Outlet 120V — 1U",
    "vendor": "Eaton",
    "collection": "pdus-power-strips",
    "sku": "PDU-12OUT-20A-1U",
    "price": "139.99",
    "compareAtPrice": "164.99",
    "uom": "EA",
    "descriptionHtml": "<p>Eaton 1U 20A rackmount PDU with 12 NEMA 5-20R outlets and 8ft 20A input cord for high-density server and network rack power distribution on 20A dedicated circuits. Lighted circuit breaker with reset button provides over-current protection and visual trip indication. All-metal chassis with tool-less side-mount brackets.</p>",
    "tags": [
      "pdus-power-strips",
      "b2b-demo",
      "sale"
    ],
    "pricingTiers": null
  },
  {
    "title": "6-Outlet Power Strip with Surge 15A 6ft Cord",
    "vendor": "Hubbell",
    "collection": "pdus-power-strips",
    "sku": "PWR-STRIP-6OUT-15A-SRG",
    "price": "34.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Hubbell 6-outlet power strip with 900-joule surge suppression, 15A circuit breaker, and 6ft 14 AWG SJT power cord for workstation, AV rack, and light equipment use. EMI/RFI noise filtering protects sensitive electronics from line-voltage disturbances. UL 1449 4th Edition listed with $25,000 connected equipment warranty.</p>",
    "tags": [
      "pdus-power-strips",
      "b2b-demo",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 34.99
      },
      {
        "minQty": 10,
        "unitPrice": 32.99
      },
      {
        "minQty": 50,
        "unitPrice": 30.49
      }
    ]
  },
  {
    "title": "Industrial Power Strip 20A 8-Outlet UL Listed",
    "vendor": "Hubbell",
    "collection": "pdus-power-strips",
    "sku": "PWR-STRIP-IND-20A-8OUT",
    "price": "89.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Hubbell heavy-duty industrial power strip with 8 NEMA 5-20R outlets, 20A lighted circuit breaker, and 10ft 12 AWG SJT cord for manufacturing, shop, and data center use on dedicated 20A branch circuits. All-metal housing with mounting flanges for bench or wall installation. UL 498 listed and CSA certified for commercial and industrial environments.</p>",
    "tags": [
      "pdus-power-strips",
      "b2b-demo",
      "new"
    ],
    "pricingTiers": null
  },
  {
    "title": "NEMA 5-20 Extension Cord 25ft 12 AWG",
    "vendor": "Southwire",
    "collection": "pdus-power-strips",
    "sku": "EXT-CORD-520-25FT-12AWG",
    "price": "39.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Southwire 25ft 12 AWG SJTW extension cord with NEMA 5-20P plug and 5-20R connector rated for 20A, 125V, and 2500W for temporary power in commercial, construction, and data center applications. Cold-weather-rated SJTW jacket remains flexible to -40°F for outdoor and unheated space use. UL/CSA listed with locking connector sleeve for secure equipment connection.</p>",
    "tags": [
      "pdus-power-strips",
      "b2b-demo",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 39.99
      },
      {
        "minQty": 10,
        "unitPrice": 37.49
      },
      {
        "minQty": 50,
        "unitPrice": 34.99
      }
    ]
  },
  {
    "title": "Whole-House Surge Protector 80kA Type 2",
    "vendor": "Square D",
    "collection": "surge-protectors-ups",
    "sku": "SURGE-WHOLE-80KA-T2",
    "price": "129.99",
    "compareAtPrice": "149.99",
    "uom": "EA",
    "descriptionHtml": "<p>Square D Homeline 80kA whole-house surge protective device (SPD) rated Type 2 for installation at the main service panel per NEC 2020 Article 230.67. Provides protection for all branch circuits against external lightning surges and internal switching transients. LED status indicators show protection status; compatible with Homeline and QO load centers. UL 1449 4th Edition listed.</p>",
    "tags": [
      "surge-protectors-ups",
      "b2b-demo",
      "sale"
    ],
    "pricingTiers": null
  },
  {
    "title": "UPS 1500VA 1350W Rack-Mount 2U",
    "vendor": "Eaton",
    "collection": "surge-protectors-ups",
    "sku": "UPS-1500VA-RM-2U",
    "price": "544.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Eaton 5PX 1500VA/1350W 2U rackmount UPS with pure sine wave output, 8 NEMA 5-20R outlets, and LCD front panel for server, network, and storage rack protection. Hot-swappable battery modules allow runtime extension without powering down connected equipment. Includes USB, RS-232, and network card slot for full SNMP/web management integration. Runtime approximately 5 minutes at full load.</p>",
    "tags": [
      "surge-protectors-ups",
      "b2b-demo",
      "new"
    ],
    "pricingTiers": null
  },
  {
    "title": "UPS 750VA 450W Tower — 6-Outlet",
    "vendor": "Eaton",
    "collection": "surge-protectors-ups",
    "sku": "UPS-750VA-TWR-6OUT",
    "price": "149.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Eaton 750VA/450W tower UPS with 6 NEMA 5-15R outlets (3 battery-backed, 3 surge-only), simulated sine wave output, and USB connectivity for graceful shutdown management of workstations and small network equipment. Cold-start capability allows operation from battery without AC input. Includes Intelligent Power Software for automatic shutdown on extended outages.</p>",
    "tags": [
      "surge-protectors-ups",
      "b2b-demo"
    ],
    "pricingTiers": null
  },
  {
    "title": "Point-of-Use Surge Strip 12-Outlet 3840J",
    "vendor": "Hubbell",
    "collection": "surge-protectors-ups",
    "sku": "SURGE-STRIP-12OUT-3840J",
    "price": "64.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Hubbell 12-outlet surge suppression strip rated 3840 joules with EMI/RFI filtering, 15A circuit breaker, and 8ft 14 AWG cord for workstation and AV equipment protection. Keystone-style openings on end panel accept optional coax, phone, or data line surge modules. UL 1449 4th Edition listed with $100,000 connected equipment warranty and LED protection status indicator.</p>",
    "tags": [
      "surge-protectors-ups",
      "b2b-demo",
      "bulk"
    ],
    "pricingTiers": [
      {
        "minQty": 1,
        "unitPrice": 64.99
      },
      {
        "minQty": 10,
        "unitPrice": 60.99
      },
      {
        "minQty": 50,
        "unitPrice": 57.49
      }
    ]
  },
  {
    "title": "Outdoor GFCI Outlet Cover Box — In-Use Weatherproof",
    "vendor": "Leviton",
    "collection": "surge-protectors-ups",
    "sku": "GFCI-OUTDR-COVER-BOX",
    "price": "27.99",
    "compareAtPrice": null,
    "uom": "EA",
    "descriptionHtml": "<p>Leviton weatherproof in-use cover box for standard duplex or GFCI outlets provides IP55-rated protection while cords are plugged in, meeting NEC 406.9(B)(1) requirements for outdoor wet locations. Extra-duty polycarbonate construction with stainless steel hinge and screw resists UV, impact, and corrosion in exposed exterior locations. Fits single-gang boxes, shallow profile fits recessed installations.</p>",
    "tags": [
      "surge-protectors-ups",
      "b2b-demo"
    ],
    "pricingTiers": null
  }
] as const;
