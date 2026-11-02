// Astronomy, the object list, and the location panel shared by the sky planning
// tools. Pages load this before their own script and read from window.SkyTools.
(function () {
    const D2R = Math.PI / 180,
        R2D = 180 / Math.PI;
    const dayMs = 864e5,
        J1970 = 2440588,
        J2000 = 2451545;

    function toJulian(date) {
        return date.valueOf() / dayMs - 0.5 + J1970;
    }
    function toDays(date) {
        return toJulian(date) - J2000;
    }
    const rad = D2R;

    function rightAscension(l, b) {
        return Math.atan2(
            Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e),
            Math.cos(l),
        );
    }
    function declination(l, b) {
        return Math.asin(
            Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l),
        );
    }
    const e = rad * 23.4397;

    function solarMeanAnomaly(d) {
        return rad * (357.5291 + 0.98560028 * d);
    }
    function eclipticLongitude(M) {
        const C =
            rad *
            (1.9148 * Math.sin(M) +
                0.02 * Math.sin(2 * M) +
                0.0003 * Math.sin(3 * M));
        const P = rad * 102.9372;
        return M + C + P + Math.PI;
    }
    function sunCoords(d) {
        const M = solarMeanAnomaly(d),
            L = eclipticLongitude(M);
        return { ra: rightAscension(L, 0), dec: declination(L, 0) };
    }
    function moonCoords(d) {
        const L = rad * (218.316 + 13.176396 * d);
        const M = rad * (134.963 + 13.064993 * d);
        const F = rad * (93.272 + 13.22935 * d);
        const l = L + rad * 6.289 * Math.sin(M);
        const b = rad * 5.128 * Math.sin(F);
        const dt = 385001 - 20905 * Math.cos(M);
        return { ra: rightAscension(l, b), dec: declination(l, b), dist: dt };
    }
    function moonIllumination(date) {
        const d = toDays(date);
        const s = sunCoords(d),
            m = moonCoords(d);
        const sdist = 149598000;
        const phi = Math.acos(
            Math.sin(s.dec) * Math.sin(m.dec) +
                Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra),
        );
        const inc = Math.atan2(
            sdist * Math.sin(phi),
            m.dist - sdist * Math.cos(phi),
        );
        const angle = Math.atan2(
            Math.cos(s.dec) * Math.sin(s.ra - m.ra),
            Math.sin(s.dec) * Math.cos(m.dec) -
                Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra),
        );
        return {
            fraction: (1 + Math.cos(inc)) / 2,
            phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI,
            ra: m.ra,
            dec: m.dec,
        };
    }
    function GMST(jd) {
        const T = (jd - 2451545.0) / 36525;
        let g =
            280.46061837 +
            360.98564736629 * (jd - 2451545.0) +
            0.000387933 * T * T -
            (T * T * T) / 38710000;
        return ((g % 360) + 360) % 360;
    }
    function altitudeOf(date, raRad, decRad, latDeg, lonDeg) {
        const jd = toJulian(date);
        const gmst = GMST(jd);
        const lst = (((gmst + lonDeg) % 360) + 360) % 360;
        let ha = lst - raRad * R2D;
        ha = ((ha + 540) % 360) - 180;
        const haRad = ha * D2R,
            latRad = latDeg * D2R;
        const alt = Math.asin(
            Math.sin(latRad) * Math.sin(decRad) +
                Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad),
        );
        return alt * R2D;
    }
    function moonAltitude(date, raRad, decRad, latDeg, lonDeg) {
        return altitudeOf(date, raRad, decRad, latDeg, lonDeg);
    }
    function sunAltitude(date, latDeg, lonDeg) {
        const s = sunCoords(toDays(date));
        return altitudeOf(date, s.ra, s.dec, latDeg, lonDeg);
    }
    // Finds astronomical dusk (evening, sun descending through -18deg) and dawn
    // (following morning, sun ascending through -18deg) for the local calendar
    // date of `dateStr`, by scanning from local noon through noon the next day.
    function twilightTimes(dateStr, latDeg, lonDeg) {
        const [y, m, dd] = dateStr.split("-").map(Number);
        const start = new Date(y, m - 1, dd, 12, 0, 0); // local noon
        const stepMin = 3;
        const steps = Math.round((24 * 60) / stepMin);
        let prevT = start,
            prevAlt = sunAltitude(prevT, latDeg, lonDeg);
        let dusk = null,
            dawn = null;
        for (let i = 1; i <= steps; i++) {
            const t = new Date(start.getTime() + i * stepMin * 60000);
            const alt = sunAltitude(t, latDeg, lonDeg);
            if (!dusk && prevAlt > -18 && alt <= -18) {
                const frac = (prevAlt - -18) / (prevAlt - alt);
                dusk = new Date(
                    prevT.getTime() + frac * (t.getTime() - prevT.getTime()),
                );
            } else if (dusk && !dawn && prevAlt <= -18 && alt > -18) {
                const frac = (-18 - prevAlt) / (alt - prevAlt);
                dawn = new Date(
                    prevT.getTime() + frac * (t.getTime() - prevT.getTime()),
                );
                break;
            }
            prevT = t;
            prevAlt = alt;
        }
        return { dusk, dawn };
    }
    function fmtDate(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    function fmtTime(d) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    function angSep(ra1, dec1, ra2, dec2) {
        const cosSep =
            Math.sin(dec1) * Math.sin(dec2) +
            Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2);
        return Math.acos(Math.min(1, Math.max(-1, cosSep))) * R2D;
    }
    function raDecStr(raRad, decRad) {
        const raH = ((raRad * R2D) / 15 + 24) % 24;
        const h = Math.floor(raH),
            m = Math.floor((raH - h) * 60),
            s = Math.round(((raH - h) * 60 - m) * 60);
        const decD = decRad * R2D;
        const sign = decD < 0 ? "-" : "+";
        const ad = Math.abs(decD);
        const dd = Math.floor(ad),
            dm = Math.floor((ad - dd) * 60),
            ds = Math.round(((ad - dd) * 60 - dm) * 60);
        return `${h}h${m.toString().padStart(2, "0")}m${s.toString().padStart(2, "0")}s <small>/</small> ${sign}${dd}°${dm.toString().padStart(2, "0")}'${ds.toString().padStart(2, "0")}"`;
    }

    // One entry per object. names[0] is the id and sets the catalog group: Messier,
    // then Caldwell, NGC, IC. Other names are searchable aliases of the same object.
    const TARGETS = [
        {names: ["M1", "NGC 1952"], common: "Crab Nebula", ra: 83.6332, dec: 22.0145, con: "Taurus", type: "Supernova Remnant"},
        {names: ["M2", "NGC 7089"], common: null, ra: 323.3625, dec: -0.8233, con: "Aquarius", type: "Globular Cluster"},
        {names: ["M3", "NGC 5272"], common: null, ra: 205.5468, dec: 28.3754, con: "Canes Venatici", type: "Globular Cluster"},
        {names: ["M4", "NGC 6121"], common: null, ra: 245.8975, dec: -26.5255, con: "Scorpius", type: "Globular Cluster"},
        {names: ["M5", "NGC 5904"], common: null, ra: 229.6406, dec: 2.0827, con: "Serpens Caput", type: "Globular Cluster"},
        {names: ["M6", "NGC 6405"], common: "Butterfly Cluster", ra: 265.0865, dec: -32.2542, con: "Scorpius", type: "Open Cluster"},
        {names: ["M7", "NGC 6475"], common: "Ptolemy's Cluster", ra: 268.4632, dec: -34.7928, con: "Scorpius", type: "Open Cluster"},
        {names: ["M8", "NGC 6523", "NGC 6533"], common: "Lagoon Nebula", ra: 270.922, dec: -24.3802, con: "Sagittarius", type: "Diffuse Nebula"},
        {names: ["M9", "NGC 6333"], common: null, ra: 259.7991, dec: -18.5162, con: "Ophiuchus", type: "Globular Cluster"},
        {names: ["M10", "NGC 6254"], common: null, ra: 254.2875, dec: -4.0993, con: "Ophiuchus", type: "Globular Cluster"},
        {names: ["M11", "NGC 6705"], common: "Wild Duck Cluster", ra: 282.775, dec: -6.27, con: "Scutum", type: "Open Cluster"},
        {names: ["M12", "NGC 6218"], common: null, ra: 251.8105, dec: -1.9478, con: "Ophiuchus", type: "Globular Cluster"},
        {names: ["M13", "NGC 6205"], common: "Hercules Globular Cluster", ra: 250.4235, dec: 36.4613, con: "Hercules", type: "Globular Cluster"},
        {names: ["M14", "NGC 6402"], common: null, ra: 264.4007, dec: -3.2459, con: "Ophiuchus", type: "Globular Cluster"},
        {names: ["M15", "NGC 7078"], common: null, ra: 322.4932, dec: 12.1668, con: "Pegasus", type: "Globular Cluster"},
        {names: ["M16", "NGC 6611", "IC 4703"], common: "Eagle Nebula Cluster", ra: 274.7007, dec: -13.8072, con: "Serpens Cauda", type: "Open Cluster"},
        {names: ["M17", "NGC 6618"], common: "Omega Nebula", ra: 275.1963, dec: -16.1715, con: "Sagittarius", type: "Diffuse Nebula"},
        {names: ["M18", "NGC 6613"], common: null, ra: 274.9937, dec: -17.102, con: "Sagittarius", type: "Open Cluster"},
        {names: ["M19", "NGC 6273"], common: null, ra: 255.657, dec: -26.2679, con: "Ophiuchus", type: "Globular Cluster"},
        {names: ["M20", "NGC 6514"], common: "Trifid Nebula", ra: 270.6755, dec: -22.9719, con: "Sagittarius", type: "Diffuse Nebula"},
        {names: ["M21", "NGC 6531"], common: null, ra: 271.056, dec: -22.4901, con: "Sagittarius", type: "Open Cluster"},
        {names: ["M22", "NGC 6656"], common: null, ra: 279.1008, dec: -23.9034, con: "Sagittarius", type: "Globular Cluster"},
        {names: ["M23", "NGC 6494"], common: null, ra: 269.2699, dec: -18.9853, con: "Sagittarius", type: "Open Cluster"},
        {names: ["M24", "IC 4715"], common: "Milky Way Patch", ra: 274.2338, dec: -18.5146, con: "Sagittarius", type: "Star Cloud"},
        {names: ["M25", "IC 4725"], common: null, ra: 277.9449, dec: -19.1149, con: "Sagittarius", type: "Open Cluster"},
        {names: ["M26", "NGC 6694"], common: null, ra: 281.3278, dec: -9.3836, con: "Scutum", type: "Open Cluster"},
        {names: ["M27", "NGC 6853"], common: "Dumbbell Nebula", ra: 299.9016, dec: 22.721, con: "Vulpecula", type: "Planetary Nebula"},
        {names: ["M28", "NGC 6626"], common: null, ra: 276.137, dec: -24.8698, con: "Sagittarius", type: "Globular Cluster"},
        {names: ["M29", "NGC 6913"], common: null, ra: 305.9907, dec: 38.5077, con: "Cygnus", type: "Open Cluster"},
        {names: ["M30", "NGC 7099"], common: null, ra: 325.0918, dec: -23.1791, con: "Capricornus", type: "Globular Cluster"},
        {names: ["M31", "NGC 224"], common: "Andromeda Galaxy", ra: 10.6848, dec: 41.2691, con: "Andromeda", type: "Spiral Galaxy"},
        {names: ["M32", "NGC 221"], common: "Satellite of M31", ra: 10.6743, dec: 40.8653, con: "Andromeda", type: "Elliptical Galaxy"},
        {names: ["M33", "NGC 598"], common: "Triangulum Galaxy", ra: 23.462, dec: 30.6602, con: "Triangulum", type: "Spiral Galaxy"},
        {names: ["M34", "NGC 1039"], common: null, ra: 40.5308, dec: 42.7461, con: "Perseus", type: "Open Cluster"},
        {names: ["M35", "NGC 2168"], common: null, ra: 92.2711, dec: 24.3386, con: "Gemini", type: "Open Cluster"},
        {names: ["M36", "NGC 1960"], common: null, ra: 84.0739, dec: 34.1407, con: "Auriga", type: "Open Cluster"},
        {names: ["M37", "NGC 2099"], common: null, ra: 88.0765, dec: 32.553, con: "Auriga", type: "Open Cluster"},
        {names: ["M38", "NGC 1912"], common: null, ra: 82.177, dec: 35.8549, con: "Auriga", type: "Open Cluster"},
        {names: ["M39", "NGC 7092"], common: null, ra: 322.9513, dec: 48.4382, con: "Cygnus", type: "Open Cluster"},
        {names: ["M40", "Winnecke 4"], common: "Winnecke 4", ra: 185.5478, dec: 58.0878, con: "Ursa Major", type: "Double Star"},
        {names: ["M41", "NGC 2287"], common: null, ra: 101.4998, dec: -20.7542, con: "Canis Major", type: "Open Cluster"},
        {names: ["M42", "NGC 1976"], common: "Orion Nebula", ra: 83.8187, dec: -5.3897, con: "Orion", type: "Diffuse Nebula"},
        {names: ["M43", "NGC 1982"], common: "de Mairan's Nebula", ra: 83.8807, dec: -5.2675, con: "Orion", type: "Diffuse Nebula"},
        {names: ["M44", "NGC 2632"], common: "Beehive Cluster", ra: 130.0925, dec: 19.6721, con: "Cancer", type: "Open Cluster"},
        {names: ["M45", "Melotte 22"], common: "Pleiades", ra: 56.7474, dec: 24.1161, con: "Taurus", type: "Open Cluster"},
        {names: ["M46", "NGC 2437"], common: null, ra: 115.4451, dec: -14.81, con: "Puppis", type: "Open Cluster"},
        {names: ["M47", "NGC 2422", "NGC 2478"], common: null, ra: 114.1459, dec: -14.4826, con: "Puppis", type: "Open Cluster"},
        {names: ["M48", "NGC 2548"], common: null, ra: 123.4299, dec: -5.7504, con: "Hydra", type: "Open Cluster"},
        {names: ["M49", "NGC 4472"], common: null, ra: 187.4448, dec: 8.0005, con: "Virgo", type: "Elliptical Galaxy"},
        {names: ["M50", "NGC 2323"], common: null, ra: 105.6686, dec: -8.364, con: "Monoceros", type: "Open Cluster"},
        {names: ["M51", "NGC 5194"], common: "Whirlpool Galaxy", ra: 202.4696, dec: 47.1952, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["M52", "NGC 7654"], common: null, ra: 351.2017, dec: 61.5932, con: "Cassiopeia", type: "Open Cluster"},
        {names: ["M53", "NGC 5024"], common: null, ra: 198.2301, dec: 18.1691, con: "Coma Berenices", type: "Globular Cluster"},
        {names: ["M54", "NGC 6715"], common: null, ra: 283.7636, dec: -30.4785, con: "Sagittarius", type: "Globular Cluster"},
        {names: ["M55", "NGC 6809"], common: null, ra: 294.9975, dec: -30.9621, con: "Sagittarius", type: "Globular Cluster"},
        {names: ["M56", "NGC 6779"], common: null, ra: 289.148, dec: 30.1845, con: "Lyra", type: "Globular Cluster"},
        {names: ["M57", "NGC 6720"], common: "Ring Nebula", ra: 283.3959, dec: 33.0286, con: "Lyra", type: "Planetary Nebula"},
        {names: ["M58", "NGC 4579"], common: null, ra: 189.4313, dec: 11.8182, con: "Virgo", type: "Spiral Galaxy"},
        {names: ["M59", "NGC 4621"], common: null, ra: 190.5093, dec: 11.647, con: "Virgo", type: "Elliptical Galaxy"},
        {names: ["M60", "NGC 4649"], common: null, ra: 190.9166, dec: 11.5527, con: "Virgo", type: "Elliptical Galaxy"},
        {names: ["M61", "NGC 4303"], common: null, ra: 185.4787, dec: 4.4736, con: "Virgo", type: "Spiral Galaxy"},
        {names: ["M62", "NGC 6266"], common: null, ra: 255.3025, dec: -30.1124, con: "Ophiuchus", type: "Globular Cluster"},
        {names: ["M63", "NGC 5055"], common: "Sunflower Galaxy", ra: 198.9555, dec: 42.0293, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["M64", "NGC 4826"], common: "Blackeye Galaxy", ra: 194.1818, dec: 21.683, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["M65", "NGC 3623"], common: null, ra: 169.733, dec: 13.0924, con: "Leo", type: "Spiral Galaxy"},
        {names: ["M66", "NGC 3627"], common: null, ra: 170.0623, dec: 12.9915, con: "Leo", type: "Spiral Galaxy"},
        {names: ["M67", "NGC 2682"], common: null, ra: 132.8339, dec: 11.8119, con: "Cancer", type: "Open Cluster"},
        {names: ["M68", "NGC 4590"], common: null, ra: 189.8667, dec: -26.743, con: "Hydra", type: "Globular Cluster"},
        {names: ["M69", "NGC 6637", "NGC 6634"], common: null, ra: 277.8468, dec: -32.348, con: "Sagittarius", type: "Globular Cluster"},
        {names: ["M70", "NGC 6681"], common: null, ra: 280.8027, dec: -32.2919, con: "Sagittarius", type: "Globular Cluster"},
        {names: ["M71", "NGC 6838", "NGC 6839"], common: null, ra: 298.4421, dec: 18.7784, con: "Sagitta", type: "Globular Cluster"},
        {names: ["M72", "NGC 6981"], common: null, ra: 313.3663, dec: -12.5371, con: "Aquarius", type: "Globular Cluster"},
        {names: ["M73", "NGC 6994"], common: "Group of 4 stars", ra: 314.7332, dec: -12.6355, con: "Aquarius", type: "Group/Asterism"},
        {names: ["M74", "NGC 628"], common: null, ra: 24.174, dec: 15.7837, con: "Pisces", type: "Spiral Galaxy"},
        {names: ["M75", "NGC 6864"], common: null, ra: 301.5202, dec: -21.9222, con: "Sagittarius", type: "Globular Cluster"},
        {names: ["M76", "NGC 650", "NGC 651"], common: "Little Dumbbell Nebula", ra: 25.582, dec: 51.5755, con: "Perseus", type: "Planetary Nebula"},
        {names: ["M77", "NGC 1068"], common: "Cetus A", ra: 40.6696, dec: -0.0133, con: "Cetus", type: "Spiral Galaxy"},
        {names: ["M78", "NGC 2068"], common: null, ra: 86.6909, dec: 0.0793, con: "Orion", type: "Diffuse Nebula"},
        {names: ["M79", "NGC 1904"], common: null, ra: 81.0441, dec: -24.5242, con: "Lepus", type: "Globular Cluster"},
        {names: ["M80", "NGC 6093"], common: null, ra: 244.2605, dec: -22.9751, con: "Scorpius", type: "Globular Cluster"},
        {names: ["M81", "NGC 3031"], common: "Bode's Galaxy", ra: 148.8882, dec: 69.0653, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["M82", "NGC 3034"], common: "Cigar Galaxy", ra: 148.9697, dec: 69.6794, con: "Ursa Major", type: "Irregular Galaxy"},
        {names: ["M83", "NGC 5236"], common: "Southern Pinwheel Galaxy", ra: 204.254, dec: -29.8654, con: "Hydra", type: "Spiral Galaxy"},
        {names: ["M84", "NGC 4374"], common: null, ra: 186.2656, dec: 12.887, con: "Virgo", type: "Lenticular (S0) Galaxy"},
        {names: ["M85", "NGC 4382"], common: null, ra: 186.3505, dec: 18.1915, con: "Coma Berenices", type: "Lenticular (S0) Galaxy"},
        {names: ["M86", "NGC 4406"], common: null, ra: 186.5489, dec: 12.9462, con: "Virgo", type: "Lenticular (S0) Galaxy"},
        {names: ["M87", "NGC 4486"], common: "Virgo A", ra: 187.7059, dec: 12.3911, con: "Virgo", type: "Elliptical Galaxy"},
        {names: ["M88", "NGC 4501"], common: null, ra: 187.9965, dec: 14.4204, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["M89", "NGC 4552"], common: null, ra: 188.9159, dec: 12.5563, con: "Virgo", type: "Elliptical Galaxy"},
        {names: ["M90", "NGC 4569"], common: null, ra: 189.2075, dec: 13.1629, con: "Virgo", type: "Spiral Galaxy"},
        {names: ["M91", "NGC 4548"], common: null, ra: 188.8602, dec: 14.4963, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["M92", "NGC 6341"], common: null, ra: 259.2803, dec: 43.1365, con: "Hercules", type: "Globular Cluster"},
        {names: ["M93", "NGC 2447"], common: null, ra: 116.1218, dec: -23.8531, con: "Puppis", type: "Open Cluster"},
        {names: ["M94", "NGC 4736"], common: null, ra: 192.7211, dec: 41.1204, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["M95", "NGC 3351"], common: null, ra: 160.9904, dec: 11.7038, con: "Leo", type: "Spiral Galaxy"},
        {names: ["M96", "NGC 3368"], common: null, ra: 161.6906, dec: 11.8199, con: "Leo", type: "Spiral Galaxy"},
        {names: ["M97", "NGC 3587"], common: "Owl Nebula", ra: 168.6988, dec: 55.019, con: "Ursa Major", type: "Planetary Nebula"},
        {names: ["M98", "NGC 4192"], common: null, ra: 183.4512, dec: 14.9003, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["M99", "NGC 4254"], common: null, ra: 184.7067, dec: 14.4165, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["M100", "NGC 4321"], common: null, ra: 185.7285, dec: 15.8218, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["M101", "NGC 5457"], common: "Pinwheel Galaxy", ra: 210.8023, dec: 54.3489, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["M102", "NGC 5866"], common: "Spindle Galaxy", ra: 226.6258, dec: 55.7683, con: "Draco", type: "Lenticular (S0) Galaxy"},
        {names: ["M103", "NGC 581"], common: null, ra: 23.3409, dec: 60.658, con: "Cassiopeia", type: "Open Cluster"},
        {names: ["M104", "NGC 4594"], common: "Sombrero Galaxy", ra: 189.9976, dec: -11.6231, con: "Virgo", type: "Spiral Galaxy"},
        {names: ["M105", "NGC 3379"], common: null, ra: 161.9566, dec: 12.5816, con: "Leo", type: "Elliptical Galaxy"},
        {names: ["M106", "NGC 4258"], common: null, ra: 184.7396, dec: 47.304, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["M107", "NGC 6171"], common: null, ra: 248.133, dec: -13.0536, con: "Ophiuchus", type: "Globular Cluster"},
        {names: ["M108", "NGC 3556"], common: null, ra: 167.879, dec: 55.6741, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["M109", "NGC 3992"], common: null, ra: 179.3999, dec: 53.3745, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["M110", "NGC 205"], common: "Satellite of M31", ra: 10.092, dec: 41.6853, con: "Andromeda", type: "Elliptical Galaxy"},
        {names: ["C1", "NGC 188"], common: null, ra: 11.8647, dec: 85.2696, con: "Cepheus", type: "Open Cluster"},
        {names: ["C2", "NGC 40"], common: "Bow-Tie Nebula", ra: 3.2543, dec: 72.5219, con: "Cepheus", type: "Planetary Nebula"},
        {names: ["C3", "NGC 4236"], common: null, ra: 184.1755, dec: 69.4626, con: "Draco", type: "Spiral Galaxy"},
        {names: ["C4", "NGC 7023"], common: "Iris Nebula", ra: 315.4, dec: 68.167, con: "Cepheus", type: "Reflection Nebula"},
        {names: ["C5", "IC 342"], common: "Hidden Galaxy", ra: 56.7021, dec: 68.0964, con: "Camelopardalis", type: "Spiral Galaxy"},
        {names: ["C6", "NGC 6543"], common: "Cat's Eye Nebula", ra: 269.6391, dec: 66.6332, con: "Draco", type: "Planetary Nebula"},
        {names: ["C7", "NGC 2403"], common: null, ra: 114.2142, dec: 65.6026, con: "Camelopardalis", type: "Spiral Galaxy"},
        {names: ["C8", "NGC 559"], common: null, ra: 22.3882, dec: 63.3014, con: "Cassiopeia", type: "Open Cluster"},
        {names: ["C9", "Sh2-155"], common: "Cave Nebula", ra: 344.2, dec: 62.617, con: "Cepheus", type: "Emission Nebula"},
        {names: ["C10", "NGC 663"], common: null, ra: 26.5669, dec: 61.2182, con: "Cassiopeia", type: "Open Cluster"},
        {names: ["C11", "NGC 7635"], common: "Bubble Nebula", ra: 350.175, dec: 61.2, con: "Cassiopeia", type: "Emission Nebula"},
        {names: ["C12", "NGC 6946"], common: "Fireworks Galaxy", ra: 308.7, dec: 60.15, con: "Cepheus", type: "Spiral Galaxy"},
        {names: ["C13", "NGC 457"], common: "Owl Cluster", ra: 19.886, dec: 58.2907, con: "Cassiopeia", type: "Open Cluster"},
        {names: ["C14", "NGC 869", "NGC 884"], common: "Double Cluster", ra: 35.175, dec: 57.1375, con: "Perseus", type: "Open Cluster"},
        {names: ["C15", "NGC 6826"], common: "Blinking Planetary", ra: 296.2005, dec: 50.525, con: "Cygnus", type: "Planetary Nebula"},
        {names: ["C16", "NGC 7243"], common: null, ra: 333.7858, dec: 49.8975, con: "Lacerta", type: "Open Cluster"},
        {names: ["C17", "NGC 147"], common: null, ra: 8.3005, dec: 48.5087, con: "Cassiopeia", type: "Elliptical Galaxy"},
        {names: ["C18", "NGC 185"], common: null, ra: 9.7415, dec: 48.3374, con: "Cassiopeia", type: "Elliptical Galaxy"},
        {names: ["C19", "IC 5146"], common: "Cocoon Nebula", ra: 328.375, dec: 47.267, con: "Cygnus", type: "Emission/Reflection Nebula"},
        {names: ["C20", "NGC 7000"], common: "North America Nebula", ra: 314.7, dec: 44.33, con: "Cygnus", type: "Emission Nebula"},
        {names: ["C21", "NGC 4449"], common: null, ra: 187.0462, dec: 44.0936, con: "Canes Venatici", type: "Irregular Galaxy"},
        {names: ["C22", "NGC 7662"], common: "Blue Snowball Nebula", ra: 351.4746, dec: 42.5349, con: "Andromeda", type: "Planetary Nebula"},
        {names: ["C23", "NGC 891"], common: "Silver Sliver Galaxy", ra: 35.65, dec: 42.35, con: "Andromeda", type: "Spiral Galaxy (edge-on)"},
        {names: ["C24", "NGC 1275"], common: "Perseus A", ra: 49.9507, dec: 41.5117, con: "Perseus", type: "Lenticular Galaxy"},
        {names: ["C25", "NGC 2419"], common: "Intergalactic Wanderer", ra: 114.5331, dec: 38.88, con: "Lynx", type: "Globular Cluster"},
        {names: ["C26", "NGC 4244"], common: null, ra: 184.3736, dec: 37.8071, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["C27", "NGC 6888"], common: "Crescent Nebula", ra: 303, dec: 38.35, con: "Cygnus", type: "Emission Nebula"},
        {names: ["C28", "NGC 752"], common: null, ra: 29.3951, dec: 37.8334, con: "Andromeda", type: "Open Cluster"},
        {names: ["C29", "NGC 5005"], common: null, ra: 197.7343, dec: 37.0592, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["C30", "NGC 7331"], common: "Deer Lick Group", ra: 339.275, dec: 34.417, con: "Pegasus", type: "Spiral Galaxy"},
        {names: ["C31", "IC 405"], common: "Flaming Star Nebula", ra: 79.1228, dec: 34.3562, con: "Auriga", type: "Emission/Reflection Nebula"},
        {names: ["C32", "NGC 4631"], common: "Whale Galaxy", ra: 190.5334, dec: 32.5415, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["C33", "NGC 6992", "NGC 6995", "IC 1340"], common: "Veil Nebula (Eastern)", ra: 314.1, dec: 31.717, con: "Cygnus", type: "Supernova Remnant"},
        {names: ["C34", "NGC 6960"], common: "Veil Nebula (Western)", ra: 311.425, dec: 30.717, con: "Cygnus", type: "Supernova Remnant"},
        {names: ["C35", "NGC 4889", "NGC 4884"], common: "Coma Cluster core", ra: 195.0339, dec: 27.977, con: "Coma Berenices", type: "Elliptical Galaxy"},
        {names: ["C36", "NGC 4559"], common: null, ra: 188.9902, dec: 27.96, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["C37", "NGC 6885", "NGC 6882"], common: null, ra: 302.9828, dec: 26.4888, con: "Vulpecula", type: "Open Cluster"},
        {names: ["C38", "NGC 4565"], common: "Needle Galaxy", ra: 189.075, dec: 25.983, con: "Coma Berenices", type: "Spiral Galaxy (edge-on)"},
        {names: ["C39", "NGC 2392"], common: "Eskimo Nebula", ra: 112.2948, dec: 20.9118, con: "Gemini", type: "Planetary Nebula"},
        {names: ["C40", "NGC 3626", "NGC 3632"], common: null, ra: 170.0159, dec: 18.3568, con: "Leo", type: "Lenticular Galaxy"},
        {names: ["C41", "Melotte 25"], common: "Hyades", ra: 66.725, dec: 15.8667, con: "Taurus", type: "Open Cluster"},
        {names: ["C42", "NGC 7006"], common: null, ra: 315.3719, dec: 16.1875, con: "Delphinus", type: "Globular Cluster"},
        {names: ["C43", "NGC 7814"], common: "Little Sombrero", ra: 0.812, dec: 16.1454, con: "Pegasus", type: "Spiral Galaxy"},
        {names: ["C44", "NGC 7479"], common: null, ra: 346.236, dec: 12.3229, con: "Pegasus", type: "Spiral Galaxy"},
        {names: ["C45", "NGC 5248"], common: null, ra: 204.3834, dec: 8.8852, con: "Boötes", type: "Spiral Galaxy"},
        {names: ["C46", "NGC 2261"], common: "Hubble's Variable Nebula", ra: 99.7896, dec: 8.7443, con: "Monoceros", type: "Reflection Nebula"},
        {names: ["C47", "NGC 6934"], common: null, ra: 308.5479, dec: 7.4041, con: "Delphinus", type: "Globular Cluster"},
        {names: ["C48", "NGC 2775"], common: null, ra: 137.5838, dec: 7.0379, con: "Cancer", type: "Spiral Galaxy"},
        {names: ["C49", "NGC 2237", "NGC 2238", "NGC 2246"], common: "Rosette Nebula", ra: 98, dec: 5.05, con: "Monoceros", type: "Emission Nebula"},
        {names: ["C50", "NGC 2244", "NGC 2239"], common: "Rosette Cluster", ra: 97.9815, dec: 4.9429, con: "Monoceros", type: "Cluster with Nebula"},
        {names: ["C51", "IC 1613"], common: null, ra: 16.1991, dec: 2.1178, con: "Cetus", type: "Irregular Galaxy"},
        {names: ["C52", "NGC 4697"], common: null, ra: 192.1495, dec: -5.8007, con: "Virgo", type: "Elliptical Galaxy"},
        {names: ["C53", "NGC 3115"], common: "Spindle Galaxy (Sextans)", ra: 151.3082, dec: -7.7186, con: "Sextans", type: "Lenticular Galaxy"},
        {names: ["C54", "NGC 2506"], common: null, ra: 120.0074, dec: -10.7696, con: "Monoceros", type: "Open Cluster"},
        {names: ["C55", "NGC 7009"], common: "Saturn Nebula", ra: 316.045, dec: -11.3632, con: "Aquarius", type: "Planetary Nebula"},
        {names: ["C56", "NGC 246"], common: "Skull Nebula", ra: 11.764, dec: -11.8719, con: "Cetus", type: "Planetary Nebula"},
        {names: ["C57", "NGC 6822", "IC 4895"], common: "Barnard's Galaxy", ra: 296.2406, dec: -14.8034, con: "Sagittarius", type: "Irregular Galaxy"},
        {names: ["C58", "NGC 2360"], common: "Caroline's Cluster", ra: 109.4297, dec: -15.6413, con: "Canis Major", type: "Open Cluster"},
        {names: ["C59", "NGC 3242"], common: "Ghost of Jupiter", ra: 156.192, dec: -18.6422, con: "Hydra", type: "Planetary Nebula"},
        {names: ["C60", "NGC 4038"], common: "Antennae Galaxies", ra: 180.4709, dec: -18.8676, con: "Corvus", type: "Spiral Galaxy"},
        {names: ["C61", "NGC 4039"], common: "Antennae Galaxies", ra: 180.473, dec: -18.8862, con: "Corvus", type: "Spiral Galaxy"},
        {names: ["C62", "NGC 247"], common: null, ra: 11.7856, dec: -20.7604, con: "Cetus", type: "Spiral Galaxy"},
        {names: ["C63", "NGC 7293"], common: "Helix Nebula", ra: 337.4107, dec: -20.8373, con: "Aquarius", type: "Planetary Nebula"},
        {names: ["C64", "NGC 2362"], common: "Tau Canis Majoris Cluster", ra: 109.6728, dec: -24.9542, con: "Canis Major", type: "Open Cluster"},
        {names: ["C65", "NGC 253"], common: "Sculptor Galaxy", ra: 11.9, dec: -25.283, con: "Sculptor", type: "Spiral Galaxy"},
        {names: ["C66", "NGC 5694"], common: null, ra: 219.9021, dec: -26.5383, con: "Hydra", type: "Globular Cluster"},
        {names: ["C67", "NGC 1097"], common: null, ra: 41.5794, dec: -30.2749, con: "Fornax", type: "Spiral Galaxy"},
        {names: ["C68", "NGC 6729"], common: "R Coronae Australis Nebula", ra: 285.4808, dec: -36.9576, con: "Corona Australis", type: "Reflection Nebula"},
        {names: ["C69", "NGC 6302"], common: "Bug Nebula", ra: 258.436, dec: -37.1031, con: "Scorpius", type: "Planetary Nebula"},
        {names: ["C70", "NGC 300"], common: null, ra: 13.7228, dec: -37.6844, con: "Sculptor", type: "Spiral Galaxy"},
        {names: ["C71", "NGC 2477"], common: null, ra: 118.0408, dec: -38.5333, con: "Puppis", type: "Open Cluster"},
        {names: ["C72", "NGC 55"], common: null, ra: 3.7233, dec: -39.1966, con: "Sculptor", type: "Spiral Galaxy"},
        {names: ["C73", "NGC 1851"], common: null, ra: 78.528, dec: -40.0466, con: "Columba", type: "Globular Cluster"},
        {names: ["C74", "NGC 3132"], common: "Eight-Burst Nebula", ra: 151.7572, dec: -40.4366, con: "Vela", type: "Planetary Nebula"},
        {names: ["C75", "NGC 6124"], common: null, ra: 246.3336, dec: -40.6537, con: "Scorpius", type: "Open Cluster"},
        {names: ["C76", "NGC 6231"], common: "Northern Jewel Box", ra: 253.5455, dec: -41.8243, con: "Scorpius", type: "Open Cluster"},
        {names: ["C77", "NGC 5128"], common: "Centaurus A", ra: 201.3651, dec: -43.0191, con: "Centaurus", type: "Lenticular Galaxy"},
        {names: ["C78", "NGC 6541"], common: null, ra: 272.0097, dec: -43.7159, con: "Corona Australis", type: "Globular Cluster"},
        {names: ["C79", "NGC 3201"], common: null, ra: 154.4032, dec: -46.4112, con: "Vela", type: "Globular Cluster"},
        {names: ["C80", "NGC 5139"], common: "Omega Centauri", ra: 201.6912, dec: -47.4769, con: "Centaurus", type: "Globular Cluster"},
        {names: ["C81", "NGC 6352"], common: null, ra: 261.3715, dec: -48.4227, con: "Ara", type: "Globular Cluster"},
        {names: ["C82", "NGC 6193"], common: null, ra: 250.3343, dec: -48.7625, con: "Ara", type: "Open Cluster"},
        {names: ["C83", "NGC 4945"], common: null, ra: 196.3645, dec: -49.4682, con: "Centaurus", type: "Spiral Galaxy"},
        {names: ["C84", "NGC 5286"], common: null, ra: 206.6108, dec: -51.3735, con: "Centaurus", type: "Globular Cluster"},
        {names: ["C85", "IC 2391"], common: "Omicron Velorum Cluster", ra: 130.1328, dec: -53.0355, con: "Vela", type: "Open Cluster"},
        {names: ["C86", "NGC 6397"], common: null, ra: 265.1723, dec: -53.6737, con: "Ara", type: "Globular Cluster"},
        {names: ["C87", "NGC 1261"], common: null, ra: 48.0639, dec: -55.2168, con: "Horologium", type: "Globular Cluster"},
        {names: ["C88", "NGC 5823"], common: null, ra: 226.3776, dec: -55.6037, con: "Circinus", type: "Open Cluster"},
        {names: ["C89", "NGC 6087"], common: "S Nor Cluster", ra: 244.7108, dec: -57.9346, con: "Norma", type: "Open Cluster"},
        {names: ["C90", "NGC 2867"], common: null, ra: 140.354, dec: -58.3117, con: "Carina", type: "Planetary Nebula"},
        {names: ["C91", "NGC 3532"], common: "Wishing Well Cluster", ra: 166.4493, dec: -58.7705, con: "Carina", type: "Open Cluster"},
        {names: ["C92", "NGC 3372"], common: "Carina Nebula", ra: 161.2855, dec: -59.8667, con: "Carina", type: "Emission Nebula"},
        {names: ["C93", "NGC 6752", "NGC 6777"], common: null, ra: 287.7158, dec: -59.9819, con: "Pavo", type: "Globular Cluster"},
        {names: ["C94", "NGC 4755"], common: "Jewel Box", ra: 193.4045, dec: -60.3563, con: "Crux", type: "Open Cluster"},
        {names: ["C95", "NGC 6025"], common: null, ra: 240.8241, dec: -60.4314, con: "Triangulum Australe", type: "Open Cluster"},
        {names: ["C96", "NGC 2516"], common: null, ra: 119.5294, dec: -60.7535, con: "Carina", type: "Open Cluster"},
        {names: ["C97", "NGC 3766"], common: "Pearl Cluster", ra: 174.06, dec: -61.6052, con: "Centaurus", type: "Open Cluster"},
        {names: ["C98", "NGC 4609"], common: "Coalsack Cluster", ra: 190.5701, dec: -62.9958, con: "Crux", type: "Open Cluster"},
        {names: ["C99", "Coalsack"], common: "Coalsack Nebula", ra: 187.8292, dec: -63.7433, con: "Crux", type: "Dark Nebula"},
        {names: ["C100", "IC 2944"], common: "Running Chicken Nebula", ra: 173.9455, dec: -63.0198, con: "Centaurus", type: "Cluster with Nebula"},
        {names: ["C101", "NGC 6744"], common: null, ra: 287.4421, dec: -63.8575, con: "Pavo", type: "Spiral Galaxy"},
        {names: ["C102", "IC 2602"], common: "Southern Pleiades", ra: 160.7395, dec: -64.3942, con: "Carina", type: "Open Cluster"},
        {names: ["C103", "NGC 2070"], common: "Tarantula Nebula", ra: 84.6765, dec: -69.1009, con: "Dorado", type: "Emission Nebula"},
        {names: ["C104", "NGC 362"], common: null, ra: 15.8093, dec: -70.8482, con: "Tucana", type: "Globular Cluster"},
        {names: ["C105", "NGC 4833"], common: null, ra: 194.8956, dec: -70.8746, con: "Musca", type: "Globular Cluster"},
        {names: ["C106", "NGC 104"], common: "47 Tucanae", ra: 6.0223, dec: -72.0814, con: "Tucana", type: "Globular Cluster"},
        {names: ["C107", "NGC 6101"], common: null, ra: 246.4524, dec: -72.2016, con: "Apus", type: "Globular Cluster"},
        {names: ["C108", "NGC 4372"], common: null, ra: 186.4391, dec: -72.6591, con: "Musca", type: "Globular Cluster"},
        {names: ["C109", "NGC 3195"], common: null, ra: 152.3374, dec: -80.8586, con: "Chamaeleon", type: "Planetary Nebula"},
        {names: ["NGC 281", "IC 11", "IC 1590"], common: "Pacman Nebula", ra: 13.2, dec: 56.617, con: "Cassiopeia", type: "Emission Nebula"},
        {names: ["NGC 288"], common: null, ra: 13.1977, dec: -26.5899, con: "Sculptor", type: "Globular Cluster"},
        {names: ["NGC 292"], common: "Small Magellanic Cloud", ra: 13.1866, dec: -72.8286, con: "Tucana", type: "Dwarf Galaxy"},
        {names: ["NGC 404"], common: "Mirach's Ghost", ra: 17.3626, dec: 35.7181, con: "Andromeda", type: "Lenticular Galaxy"},
        {names: ["NGC 436"], common: null, ra: 18.9907, dec: 58.8171, con: "Cassiopeia", type: "Open Cluster"},
        {names: ["NGC 520"], common: "Flying Ghost", ra: 21.1461, dec: 3.7924, con: "Pisces", type: "Interacting Galaxies"},
        {names: ["NGC 654"], common: null, ra: 25.9976, dec: 61.8827, con: "Cassiopeia", type: "Open Cluster"},
        {names: ["NGC 672"], common: null, ra: 26.9772, dec: 27.4328, con: "Triangulum", type: "Spiral Galaxy"},
        {names: ["NGC 896", "IC 1795"], common: "Fish Head Nebula", ra: 36.3659, dec: 62.0194, con: "Cassiopeia", type: "Emission Nebula"},
        {names: ["NGC 925"], common: null, ra: 36.8203, dec: 33.5792, con: "Triangulum", type: "Spiral Galaxy"},
        {names: ["NGC 1023"], common: null, ra: 40.1, dec: 39.0633, con: "Perseus", type: "Lenticular Galaxy"},
        {names: ["NGC 1027", "IC 1824"], common: null, ra: 40.6461, dec: 61.5944, con: "Cassiopeia", type: "Open Cluster"},
        {names: ["NGC 1055"], common: null, ra: 40.4385, dec: 0.4432, con: "Cetus", type: "Spiral Galaxy"},
        {names: ["NGC 1232"], common: "Eye of God Galaxy", ra: 47.4396, dec: -20.5793, con: "Eridanus", type: "Spiral Galaxy"},
        {names: ["NGC 1245"], common: null, ra: 48.6728, dec: 47.2387, con: "Perseus", type: "Open Cluster"},
        {names: ["NGC 1300"], common: null, ra: 49.9212, dec: -19.4114, con: "Eridanus", type: "Spiral Galaxy"},
        {names: ["NGC 1316"], common: "Fornax A", ra: 50.6738, dec: -37.2082, con: "Fornax", type: "Lenticular Galaxy"},
        {names: ["NGC 1333"], common: "Embryo Nebula", ra: 52.23, dec: 31.37, con: "Perseus", type: "Reflection Nebula"},
        {names: ["NGC 1360"], common: "Robin's Egg Nebula", ra: 53.311, dec: -25.8717, con: "Fornax", type: "Planetary Nebula"},
        {names: ["NGC 1365"], common: "Great Barred Spiral", ra: 53.4015, dec: -36.1404, con: "Fornax", type: "Spiral Galaxy"},
        {names: ["NGC 1398"], common: null, ra: 54.7172, dec: -26.3378, con: "Fornax", type: "Spiral Galaxy"},
        {names: ["NGC 1399"], common: null, ra: 54.621, dec: -35.4507, con: "Fornax", type: "Elliptical Galaxy"},
        {names: ["NGC 1491"], common: null, ra: 60.8065, dec: 51.3161, con: "Perseus", type: "Emission Nebula"},
        {names: ["NGC 1499"], common: "California Nebula", ra: 60.9, dec: 36.417, con: "Perseus", type: "Emission Nebula"},
        {names: ["NGC 1501"], common: "Oyster Nebula", ra: 61.7474, dec: 60.9207, con: "Camelopardalis", type: "Planetary Nebula"},
        {names: ["NGC 1502"], common: "Kemble's Cascade Cluster", ra: 61.9554, dec: 62.3315, con: "Camelopardalis", type: "Open Cluster"},
        {names: ["NGC 1514"], common: "Crystal Ball Nebula", ra: 62.3206, dec: 30.7759, con: "Taurus", type: "Planetary Nebula"},
        {names: ["NGC 1528"], common: null, ra: 63.8286, dec: 51.2115, con: "Perseus", type: "Open Cluster"},
        {names: ["NGC 1532"], common: null, ra: 63.018, dec: -32.8742, con: "Eridanus", type: "Spiral Galaxy"},
        {names: ["NGC 1535"], common: "Cleopatra's Eye", ra: 63.5657, dec: -12.7394, con: "Eridanus", type: "Planetary Nebula"},
        {names: ["NGC 1555"], common: "Hind's Variable Nebula", ra: 65.4976, dec: 19.5352, con: "Taurus", type: "Reflection Nebula"},
        {names: ["NGC 1560"], common: null, ra: 68.2045, dec: 71.8831, con: "Camelopardalis", type: "Spiral Galaxy"},
        {names: ["NGC 1569"], common: null, ra: 67.7044, dec: 64.8479, con: "Camelopardalis", type: "Irregular Galaxy"},
        {names: ["NGC 1579"], common: "Northern Trifid", ra: 67.5575, dec: 35.2694, con: "Perseus", type: "Cluster with Nebula"},
        {names: ["NGC 1672"], common: null, ra: 71.4271, dec: -59.2472, con: "Dorado", type: "Spiral Galaxy"},
        {names: ["NGC 1788"], common: "Cosmic Bat Nebula", ra: 76.7217, dec: -3.341, con: "Orion", type: "Reflection Nebula"},
        {names: ["NGC 1931"], common: "Fly Nebula", ra: 82.8556, dec: 34.2466, con: "Auriga", type: "Cluster with Nebula"},
        {names: ["NGC 1973", "NGC 1975", "NGC 1977"], common: "Running Man Nebula", ra: 83.7699, dec: -4.7318, con: "Orion", type: "Reflection Nebula"},
        {names: ["NGC 1999"], common: null, ra: 84.1056, dec: -6.7159, con: "Orion", type: "Reflection Nebula"},
        {names: ["NGC 2022"], common: null, ra: 85.5259, dec: 9.0865, con: "Orion", type: "Planetary Nebula"},
        {names: ["NGC 2023"], common: null, ra: 85.41, dec: -2.259, con: "Orion", type: "Reflection Nebula"},
        {names: ["NGC 2024"], common: "Flame Nebula", ra: 85.475, dec: -1.85, con: "Orion", type: "Emission Nebula"},
        {names: ["NGC 2146"], common: "Dusty Hand Galaxy", ra: 94.6571, dec: 78.357, con: "Camelopardalis", type: "Spiral Galaxy"},
        {names: ["NGC 2158"], common: null, ra: 91.8567, dec: 24.0962, con: "Gemini", type: "Open Cluster"},
        {names: ["NGC 2169"], common: "37 Cluster", ra: 92.1015, dec: 13.9649, con: "Orion", type: "Open Cluster"},
        {names: ["NGC 2170"], common: "Angel Nebula", ra: 91.8826, dec: -6.3993, con: "Monoceros", type: "Reflection Nebula"},
        {names: ["NGC 2174", "NGC 2175"], common: "Monkey Head Nebula", ra: 92.3484, dec: 20.6596, con: "Orion", type: "Emission Nebula"},
        {names: ["NGC 2207", "IC 2163"], common: null, ra: 94.0918, dec: -21.3727, con: "Canis Major", type: "Interacting Galaxies"},
        {names: ["NGC 2264"], common: "Christmas Tree/Cone Nebula", ra: 100.25, dec: 9.883, con: "Monoceros", type: "Cluster/Nebula"},
        {names: ["NGC 2301"], common: "Great Bird Cluster", ra: 102.9387, dec: 0.4592, con: "Monoceros", type: "Open Cluster"},
        {names: ["NGC 2327"], common: "Seagull Nebula Head", ra: 106.0301, dec: -11.3141, con: "Canis Major", type: "Reflection Nebula"},
        {names: ["NGC 2336"], common: null, ra: 111.7669, dec: 80.1781, con: "Camelopardalis", type: "Spiral Galaxy"},
        {names: ["NGC 2346"], common: "Winged Gem Nebula", ra: 107.3459, dec: -0.8091, con: "Monoceros", type: "Planetary Nebula"},
        {names: ["NGC 2359"], common: "Thor's Helmet", ra: 109.65, dec: -13.217, con: "Canis Major", type: "Emission Nebula"},
        {names: ["NGC 2366"], common: null, ra: 112.2278, dec: 69.2158, con: "Camelopardalis", type: "Irregular Galaxy"},
        {names: ["NGC 2371", "NGC 2372"], common: "Gemini Nebula", ra: 111.3944, dec: 29.4906, con: "Gemini", type: "Planetary Nebula"},
        {names: ["NGC 2438"], common: null, ra: 115.46, dec: -14.7358, con: "Puppis", type: "Planetary Nebula"},
        {names: ["NGC 2440"], common: null, ra: 115.4807, dec: -18.2085, con: "Puppis", type: "Planetary Nebula"},
        {names: ["NGC 2451"], common: null, ra: 116.3125, dec: -37.9674, con: "Puppis", type: "Open Cluster"},
        {names: ["NGC 2547"], common: null, ra: 122.5395, dec: -49.2057, con: "Vela", type: "Open Cluster"},
        {names: ["NGC 2683"], common: "UFO Galaxy", ra: 133.1722, dec: 33.4217, con: "Lynx", type: "Spiral Galaxy"},
        {names: ["NGC 2736"], common: "Pencil Nebula", ra: 135.0706, dec: -45.9481, con: "Vela", type: "Supernova Remnant"},
        {names: ["NGC 2841"], common: null, ra: 140.511, dec: 50.9765, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 2903", "NGC 2905"], common: null, ra: 143.0421, dec: 21.5008, con: "Leo", type: "Spiral Galaxy"},
        {names: ["NGC 2976"], common: null, ra: 146.8144, dec: 67.9164, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 3077"], common: null, ra: 150.8295, dec: 68.7339, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 3079"], common: null, ra: 150.4908, dec: 55.6798, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 3109"], common: null, ra: 150.7787, dec: -26.1596, con: "Hydra", type: "Spiral Galaxy"},
        {names: ["NGC 3114"], common: null, ra: 150.6232, dec: -60.1305, con: "Carina", type: "Open Cluster"},
        {names: ["NGC 3166"], common: null, ra: 153.44, dec: 3.4247, con: "Sextans", type: "Lenticular Galaxy"},
        {names: ["NGC 3184"], common: null, ra: 154.5702, dec: 41.4241, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 3190", "NGC 3189"], common: null, ra: 154.5235, dec: 21.8323, con: "Leo", type: "Spiral Galaxy"},
        {names: ["NGC 3198"], common: null, ra: 154.979, dec: 45.5496, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 3293"], common: "Gem Cluster", ra: 158.9532, dec: -58.2245, con: "Carina", type: "Open Cluster"},
        {names: ["NGC 3310"], common: null, ra: 159.6911, dec: 53.5034, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 3324"], common: "Gabriela Mistral Nebula", ra: 159.3175, dec: -58.6196, con: "Carina", type: "Cluster with Nebula"},
        {names: ["NGC 3344"], common: null, ra: 160.8798, dec: 24.9222, con: "Leo Minor", type: "Spiral Galaxy"},
        {names: ["NGC 3521"], common: "Bubble Galaxy", ra: 166.4524, dec: -0.0359, con: "Leo", type: "Spiral Galaxy"},
        {names: ["NGC 3576"], common: "Statue of Liberty Nebula", ra: 167.882, dec: -61.363, con: "Carina", type: "Emission Nebula"},
        {names: ["NGC 3603"], common: null, ra: 168.7775, dec: -61.2612, con: "Carina", type: "Cluster with Nebula"},
        {names: ["NGC 3628"], common: "Hamburger Galaxy", ra: 170.0707, dec: 13.5897, con: "Leo", type: "Spiral Galaxy"},
        {names: ["NGC 3718"], common: null, ra: 173.1452, dec: 53.0679, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 3953"], common: null, ra: 178.4538, dec: 52.3268, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 4013"], common: null, ra: 179.6308, dec: 43.9466, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 4088"], common: null, ra: 181.3925, dec: 50.539, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 4151"], common: null, ra: 182.6358, dec: 39.4057, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["NGC 4216"], common: null, ra: 183.9768, dec: 13.1494, con: "Virgo", type: "Spiral Galaxy"},
        {names: ["NGC 4298"], common: null, ra: 185.3865, dec: 14.6062, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["NGC 4361"], common: null, ra: 186.1282, dec: -18.7848, con: "Corvus", type: "Planetary Nebula"},
        {names: ["NGC 4395"], common: null, ra: 186.4536, dec: 33.5469, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["NGC 4414"], common: null, ra: 186.6129, dec: 31.2235, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["NGC 4435", "NGC 4438"], common: "The Eyes", ra: 186.9187, dec: 13.0789, con: "Virgo", type: "Interacting Galaxies"},
        {names: ["NGC 4485"], common: null, ra: 187.6297, dec: 41.7012, con: "Canes Venatici", type: "Irregular Galaxy"},
        {names: ["NGC 4490"], common: "Cocoon Galaxy", ra: 187.651, dec: 41.6439, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["NGC 4567", "NGC 4568"], common: "Siamese Twins", ra: 189.1363, dec: 11.258, con: "Virgo", type: "Interacting Galaxies"},
        {names: ["NGC 4605"], common: null, ra: 189.9974, dec: 61.6092, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["NGC 4656", "NGC 4657"], common: "Hockey Stick Galaxy", ra: 190.9905, dec: 32.1681, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["NGC 4725"], common: null, ra: 192.6107, dec: 25.5008, con: "Coma Berenices", type: "Spiral Galaxy"},
        {names: ["NGC 5033"], common: null, ra: 198.3645, dec: 36.5939, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["NGC 5053"], common: null, ra: 199.1125, dec: 17.6977, con: "Coma Berenices", type: "Globular Cluster"},
        {names: ["NGC 5189", "IC 4274"], common: "Spiral Planetary Nebula", ra: 203.3871, dec: -65.9741, con: "Musca", type: "Planetary Nebula"},
        {names: ["NGC 5195"], common: "Whirlpool Companion", ra: 202.4983, dec: 47.2661, con: "Canes Venatici", type: "Spiral Galaxy"},
        {names: ["NGC 5364", "NGC 5317"], common: null, ra: 209.05, dec: 5.0145, con: "Virgo", type: "Spiral Galaxy"},
        {names: ["NGC 5394", "NGC 5395"], common: "Heron Galaxy", ra: 209.6402, dec: 37.4535, con: "Canes Venatici", type: "Interacting Galaxies"},
        {names: ["NGC 5466"], common: null, ra: 211.364, dec: 28.5345, con: "Boötes", type: "Globular Cluster"},
        {names: ["NGC 5907", "NGC 5906"], common: "Splinter Galaxy", ra: 228.974, dec: 56.3288, con: "Draco", type: "Spiral Galaxy"},
        {names: ["NGC 6015"], common: null, ra: 237.8551, dec: 62.31, con: "Draco", type: "Spiral Galaxy"},
        {names: ["NGC 6164", "NGC 6165"], common: "Dragon's Egg Nebula", ra: 248.4243, dec: -48.0801, con: "Norma", type: "Emission Nebula"},
        {names: ["NGC 6188"], common: "Fighting Dragons of Ara", ra: 250.0243, dec: -48.6623, con: "Ara", type: "Emission Nebula"},
        {names: ["NGC 6207"], common: null, ra: 250.7656, dec: 36.8324, con: "Hercules", type: "Spiral Galaxy"},
        {names: ["NGC 6210"], common: "Turtle Nebula", ra: 251.123, dec: 23.7998, con: "Hercules", type: "Planetary Nebula"},
        {names: ["NGC 6229"], common: null, ra: 251.7452, dec: 47.5278, con: "Hercules", type: "Globular Cluster"},
        {names: ["NGC 6334"], common: "Cat's Paw Nebula", ra: 260.2071, dec: -36.1027, con: "Scorpius", type: "Supernova Remnant"},
        {names: ["NGC 6357"], common: "Lobster Nebula", ra: 261.1815, dec: -34.2013, con: "Scorpius", type: "Cluster with Nebula"},
        {names: ["NGC 6445"], common: "Box Nebula", ra: 267.3127, dec: -20.0095, con: "Sagittarius", type: "Planetary Nebula"},
        {names: ["NGC 6503"], common: "Lost-in-Space Galaxy", ra: 267.3601, dec: 70.1444, con: "Draco", type: "Spiral Galaxy"},
        {names: ["NGC 6559"], common: null, ra: 272.4869, dec: -24.1064, con: "Sagittarius", type: "Emission Nebula"},
        {names: ["NGC 6589", "IC 4690", "NGC 6590", "IC 1283"], common: null, ra: 274.2307, dec: -19.7771, con: "Sagittarius", type: "Reflection Nebula"},
        {names: ["NGC 6633"], common: null, ra: 276.8135, dec: 6.5082, con: "Ophiuchus", type: "Open Cluster"},
        {names: ["NGC 6712"], common: null, ra: 283.2704, dec: -8.7055, con: "Scutum", type: "Globular Cluster"},
        {names: ["NGC 6781"], common: null, ra: 289.6178, dec: 6.5397, con: "Aquila", type: "Planetary Nebula"},
        {names: ["NGC 6804"], common: null, ra: 292.8975, dec: 9.2252, con: "Aquila", type: "Planetary Nebula"},
        {names: ["NGC 6819"], common: "Foxhead Cluster", ra: 295.3254, dec: 40.1867, con: "Cygnus", type: "Open Cluster"},
        {names: ["NGC 6820", "NGC 6823"], common: null, ra: 295.6167, dec: 23.0881, con: "Vulpecula", type: "Emission Nebula"},
        {names: ["NGC 6857"], common: null, ra: 300.4505, dec: 33.5259, con: "Cygnus", type: "Emission Nebula"},
        {names: ["NGC 6871"], common: null, ra: 301.4977, dec: 35.7773, con: "Cygnus", type: "Open Cluster"},
        {names: ["NGC 6905"], common: "Blue Flash Nebula", ra: 305.5958, dec: 20.1045, con: "Delphinus", type: "Planetary Nebula"},
        {names: ["NGC 6910"], common: null, ra: 305.8002, dec: 40.7786, con: "Cygnus", type: "Open Cluster"},
        {names: ["NGC 6914"], common: null, ra: 306.1804, dec: 42.4826, con: "Cygnus", type: "Reflection Nebula"},
        {names: ["NGC 6939"], common: null, ra: 307.8755, dec: 60.6621, con: "Cepheus", type: "Open Cluster"},
        {names: ["NGC 6940"], common: null, ra: 308.6112, dec: 28.2827, con: "Vulpecula", type: "Open Cluster"},
        {names: ["NGC 6951", "NGC 6952"], common: null, ra: 309.3087, dec: 66.1056, con: "Cepheus", type: "Spiral Galaxy"},
        {names: ["NGC 6979", "NGC 6974"], common: "Pickering's Triangle", ra: 312.6167, dec: 32.0259, con: "Cygnus", type: "Supernova Remnant"},
        {names: ["NGC 7008"], common: "Fetus Nebula", ra: 315.1367, dec: 54.5432, con: "Cygnus", type: "Planetary Nebula"},
        {names: ["NGC 7026"], common: "Cheeseburger Nebula", ra: 316.577, dec: 47.8522, con: "Cygnus", type: "Planetary Nebula"},
        {names: ["NGC 7027"], common: null, ra: 316.7564, dec: 42.2365, con: "Cygnus", type: "Planetary Nebula"},
        {names: ["NGC 7129"], common: null, ra: 325.746, dec: 66.113, con: "Cepheus", type: "Cluster with Nebula"},
        {names: ["NGC 7217"], common: null, ra: 331.9683, dec: 31.3593, con: "Pegasus", type: "Spiral Galaxy"},
        {names: ["NGC 7320", "NGC 7317", "NGC 7318", "NGC 7319"], common: "Stephan's Quintet", ra: 339.0141, dec: 33.9481, con: "Pegasus", type: "Galaxy Group"},
        {names: ["NGC 7380"], common: "Wizard Nebula", ra: 341.8375, dec: 58.1324, con: "Cepheus", type: "Cluster with Nebula"},
        {names: ["NGC 7510"], common: null, ra: 347.7657, dec: 60.5709, con: "Cepheus", type: "Open Cluster"},
        {names: ["NGC 7538"], common: "Northern Lagoon Nebula", ra: 348.411, dec: 61.5124, con: "Cepheus", type: "Cluster with Nebula"},
        {names: ["NGC 7606"], common: null, ra: 349.7699, dec: -8.4851, con: "Aquarius", type: "Spiral Galaxy"},
        {names: ["NGC 7640"], common: null, ra: 350.5274, dec: 40.8454, con: "Andromeda", type: "Spiral Galaxy"},
        {names: ["NGC 7741"], common: null, ra: 355.9765, dec: 26.0756, con: "Pegasus", type: "Spiral Galaxy"},
        {names: ["NGC 7742"], common: "Fried Egg Galaxy", ra: 356.0655, dec: 10.7671, con: "Pegasus", type: "Spiral Galaxy"},
        {names: ["NGC 7789"], common: "Caroline's Rose", ra: 359.3503, dec: 56.7083, con: "Cassiopeia", type: "Open Cluster"},
        {names: ["NGC 7822"], common: null, ra: 0.8973, dec: 67.1616, con: "Cepheus", type: "Emission Nebula"},
        {names: ["IC 10"], common: null, ra: 5.0723, dec: 59.3038, con: "Cassiopeia", type: "Irregular Galaxy"},
        {names: ["IC 59"], common: "Gamma Cassiopeiae Nebula", ra: 14.3692, dec: 61.1437, con: "Cassiopeia", type: "Reflection Nebula"},
        {names: ["IC 63"], common: "Ghost of Cassiopeia", ra: 14.8702, dec: 60.9117, con: "Cassiopeia", type: "Emission Nebula"},
        {names: ["IC 289"], common: null, ra: 47.5802, dec: 61.3168, con: "Cassiopeia", type: "Planetary Nebula"},
        {names: ["IC 348", "IC 1985"], common: "Omicron Persei Cloud", ra: 56.1425, dec: 32.1628, con: "Perseus", type: "Cluster with Nebula"},
        {names: ["IC 410", "NGC 1893"], common: "Tadpoles Nebula", ra: 80.675, dec: 33.3667, con: "Auriga", type: "Emission Nebula"},
        {names: ["IC 417"], common: "Spider Nebula", ra: 82.025, dec: 34.4239, con: "Auriga", type: "Emission Nebula"},
        {names: ["IC 431"], common: null, ra: 85.0585, dec: -1.4628, con: "Orion", type: "Reflection Nebula"},
        {names: ["IC 432"], common: null, ra: 85.2333, dec: -1.507, con: "Orion", type: "Reflection Nebula"},
        {names: ["IC 434", "Barnard 33"], common: "Horsehead Nebula", ra: 85.225, dec: -2.467, con: "Orion", type: "Dark Nebula"},
        {names: ["IC 435"], common: null, ra: 85.7524, dec: -2.3126, con: "Orion", type: "Reflection Nebula"},
        {names: ["IC 443"], common: "Jellyfish Nebula", ra: 94.45, dec: 22.567, con: "Gemini", type: "Supernova Remnant"},
        {names: ["IC 447", "IC 2169"], common: null, ra: 97.7513, dec: 9.8974, con: "Monoceros", type: "Emission Nebula"},
        {names: ["IC 1101"], common: null, ra: 227.7337, dec: 5.7448, con: "Virgo", type: "Lenticular Galaxy"},
        {names: ["IC 1274"], common: null, ra: 272.4626, dec: -23.6482, con: "Sagittarius", type: "Emission Nebula"},
        {names: ["IC 1284"], common: null, ra: 274.4151, dec: -19.672, con: "Sagittarius", type: "Reflection Nebula"},
        {names: ["IC 1287"], common: null, ra: 277.857, dec: -10.7958, con: "Scutum", type: "Reflection Nebula"},
        {names: ["IC 1295"], common: null, ra: 283.6547, dec: -8.827, con: "Scutum", type: "Planetary Nebula"},
        {names: ["IC 1318"], common: "Sadr Region", ra: 305.55, dec: 40.25, con: "Cygnus", type: "Emission Nebula"},
        {names: ["IC 1396"], common: "Elephant's Trunk Nebula", ra: 324.775, dec: 57.5, con: "Cepheus", type: "Emission Nebula"},
        {names: ["IC 1470"], common: null, ra: 346.2925, dec: 60.2441, con: "Cepheus", type: "Emission Nebula"},
        {names: ["IC 1805"], common: "Heart Nebula", ra: 38.35, dec: 61.433, con: "Cassiopeia", type: "Emission Nebula"},
        {names: ["IC 1848"], common: "Soul Nebula", ra: 42.85, dec: 60.433, con: "Cassiopeia", type: "Emission Nebula"},
        {names: ["IC 1871"], common: null, ra: 44.3408, dec: 60.6724, con: "Cassiopeia", type: "Emission Nebula"},
        {names: ["IC 2118", "NGC 1909"], common: "Witch Head Nebula", ra: 76.725, dec: -7.217, con: "Eridanus", type: "Reflection Nebula"},
        {names: ["IC 2149"], common: null, ra: 89.0995, dec: 46.1048, con: "Auriga", type: "Planetary Nebula"},
        {names: ["IC 2162"], common: null, ra: 93.2696, dec: 17.9801, con: "Orion", type: "Emission Nebula"},
        {names: ["IC 2177"], common: "Seagull Nebula", ra: 106.1538, dec: -10.4711, con: "Monoceros", type: "Reflection Nebula"},
        {names: ["IC 2574"], common: "Coddington's Nebula", ra: 157.0978, dec: 68.4121, con: "Ursa Major", type: "Spiral Galaxy"},
        {names: ["IC 2948"], common: null, ra: 174.7748, dec: -63.4439, con: "Centaurus", type: "Cluster with Nebula"},
        {names: ["IC 3568"], common: "Lemon Slice Nebula", ra: 188.2783, dec: 82.5639, con: "Camelopardalis", type: "Planetary Nebula"},
        {names: ["IC 4406"], common: "Retina Nebula", ra: 215.6103, dec: -44.1502, con: "Lupus", type: "Planetary Nebula"},
        {names: ["IC 4592"], common: "Blue Horsehead Nebula", ra: 242.9945, dec: -19.4547, con: "Scorpius", type: "Reflection Nebula"},
        {names: ["IC 4593"], common: "White-Eyed Pea", ra: 242.9354, dec: 12.0714, con: "Hercules", type: "Planetary Nebula"},
        {names: ["IC 4601"], common: null, ra: 245.0742, dec: -20.0873, con: "Scorpius", type: "Reflection Nebula"},
        {names: ["IC 4603"], common: null, ra: 246.352, dec: -24.4684, con: "Ophiuchus", type: "Reflection Nebula"},
        {names: ["IC 4604"], common: "Rho Ophiuchi Cloud", ra: 246.3799, dec: -23.4366, con: "Ophiuchus", type: "Reflection Nebula"},
        {names: ["IC 4628"], common: "Prawn Nebula", ra: 254.2435, dec: -40.451, con: "Scorpius", type: "Emission Nebula"},
        {names: ["IC 4665"], common: "Summer Beehive", ra: 266.6132, dec: 5.6487, con: "Ophiuchus", type: "Open Cluster"},
        {names: ["IC 4756"], common: "Graff's Cluster", ra: 279.7146, dec: 5.4622, con: "Serpens Cauda", type: "Open Cluster"},
        {names: ["IC 4954", "IC 4955"], common: null, ra: 301.1876, dec: 29.2528, con: "Vulpecula", type: "Emission Nebula"},
        {names: ["IC 5070", "IC 5067"], common: "Pelican Nebula", ra: 312.75, dec: 44.35, con: "Cygnus", type: "Emission Nebula"},
        {names: ["IC 5076"], common: null, ra: 313.8893, dec: 47.3956, con: "Cygnus", type: "Reflection Nebula"},
        {names: ["Sh2-101"], common: "Tulip Nebula", ra: 299.9, dec: 35.267, con: "Cygnus", type: "Emission Nebula"},
        {names: ["WR 134"], common: "Wolf-Rayet Nebula", ra: 302.559, dec: 36.176, con: "Cygnus", type: "Wolf-Rayet Bubble"},
    ].map((o) => ({
        ...o,
        id: o.names[0],
        ra: o.ra * D2R,
        dec: o.dec * D2R,
    }));

    const GROUPS = {
        Ha: { base: 20, k: 20 },
        OIII: { base: 25, k: 35 },
        SII: { base: 15, k: 15 },
        L: { base: 35, k: 55 },
        RGB: { base: 45, k: 75 },
    };
    const FILTER_GROUP_LABEL = {
        Ha: "Hα",
        OIII: "OIII",
        SII: "SII",
        L: "Luminance",
        RGB: "RGB (broadband)",
    };


    function safeGetItem(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (err) {
            return null;
        }
    }
    function safeSetItem(key, val) {
        try {
            window.localStorage.setItem(key, val);
        } catch (err) {
            /* ignore, e.g. sandboxed context */
        }
    }
    // Wires up the latitude, longitude, and "Use my location" controls. Both tools
    // use the same element ids, and saved values carry over between them.
    function setupLocationPanel(onUpdate) {
        ["siteLat", "siteLon"].forEach((id) => {
            document.getElementById(id).addEventListener("change", () => {
                safeSetItem(id, document.getElementById(id).value);
            });
        });

        const btn = document.getElementById("useMyLocation");
        const status = document.getElementById("locateStatus");
        const siteName = document.getElementById("siteName");
        let lookupId = 0; // Lets a newer edit or click discard an older lookup.

        function setSiteName(name) {
            siteName.textContent = name;
            safeSetItem("siteName", name);
        }

        // BigDataCloud's free API only allows the device's current location, so
        // manually typed coordinates clear the name instead of looking one up.
        ["siteLat", "siteLon"].forEach((id) => {
            document.getElementById(id).addEventListener("input", () => {
                status.textContent = "";
                lookupId++;
                setSiteName("");
            });
        });

        siteName.textContent = safeGetItem("siteName") || "";

        if (!("geolocation" in navigator)) return;
        document.getElementById("locateRow").hidden = false;

        // Allow a burst of 3 lookups, then one every 2 minutes. One lookup slot
        // comes back every 2 minutes. Saved so that reloading doesn't reset it.
        const LOOKUP_BURST = 3;
        const LOOKUP_INTERVAL_MS = 2 * 60 * 1000;
        let lookupsClearAt = 0; // When every slot will be free again.

        function lookupWaitMs(now) {
            const saved = Number(safeGetItem("siteLookupsClearAt")) || 0;
            lookupsClearAt = Math.min(
                Math.max(saved, lookupsClearAt),
                now + LOOKUP_BURST * LOOKUP_INTERVAL_MS,
            );
            return Math.max(
                0,
                lookupsClearAt - (LOOKUP_BURST - 1) * LOOKUP_INTERVAL_MS - now,
            );
        }

        function recordLookup(now) {
            lookupsClearAt = Math.max(lookupsClearAt, now) + LOOKUP_INTERVAL_MS;
            safeSetItem("siteLookupsClearAt", String(lookupsClearAt));
        }

        function formatWait(ms) {
            const totalSeconds = Math.ceil(ms / 1000);
            const seconds = String(totalSeconds % 60).padStart(2, "0");
            return `${Math.floor(totalSeconds / 60)}:${seconds}`;
        }

        async function lookUpPlaceName(lat, lon) {
            const id = ++lookupId;
            setSiteName("");
            const now = Date.now();
            const waitMs = lookupWaitMs(now);
            if (waitMs > 0) {
                status.textContent = `Location updated. Try again in ${formatWait(waitMs)} to get the place name.`;
                return;
            }
            recordLookup(now);
            try {
                const res = await fetch(
                    "https://api.bigdatacloud.net/data/reverse-geocode-client" +
                        `?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
                    { signal: AbortSignal.timeout(8000) },
                );
                if (!res.ok) return;
                const place = await res.json();
                if (id !== lookupId) return;
                const parts = [
                    place.city || place.locality,
                    place.principalSubdivision,
                    place.countryCode === "US" ? "" : place.countryName,
                ].filter(Boolean);
                setSiteName([...new Set(parts)].join(", "));
            } catch (err) {
                /* The name is optional; the coordinates are already filled in. */
            }
        }

        const ERROR_MESSAGES = {
            1: "Location permission denied. Enter coordinates manually.",
            2: "Location unavailable. Enter coordinates manually.",
            3: "Location request timed out. Try again or enter coordinates manually.",
        };

        btn.addEventListener("click", () => {
            btn.disabled = true;
            status.textContent = "Getting location…";
            navigator.geolocation.getCurrentPosition(
                ({ coords }) => {
                    const latInput = document.getElementById("siteLat");
                    const lonInput = document.getElementById("siteLon");
                    const previous = latInput.value + "," + lonInput.value;
                    // Two decimals (about 1 km) is plenty for moon altitude and twilight.
                    [
                        ["siteLat", coords.latitude],
                        ["siteLon", coords.longitude],
                    ].forEach(([id, val]) => {
                        const rounded = val.toFixed(2);
                        document.getElementById(id).value = rounded;
                        safeSetItem(id, rounded);
                    });
                    status.textContent = "Location updated.";
                    btn.disabled = false;
                    onUpdate();
                    // Typing clears the name, so a name still showing belongs to
                    // the previous coordinates. If they're unchanged, keep it.
                    const unchanged =
                        previous === latInput.value + "," + lonInput.value;
                    if (!(unchanged && siteName.textContent)) {
                        lookUpPlaceName(latInput.value, lonInput.value);
                    }
                },
                (err) => {
                    status.textContent =
                        ERROR_MESSAGES[err.code] ||
                        "Couldn't get location. Enter coordinates manually.";
                    btn.disabled = false;
                },
                { timeout: 10000, maximumAge: 600000 },
            );
        });
        }

    window.SkyTools = {
        D2R,
        R2D,
        GMST,
        toJulian,
        moonIllumination,
        moonAltitude,
        altitudeOf,
        twilightTimes,
        fmtDate,
        fmtTime,
        angSep,
        raDecStr,
        TARGETS,
        GROUPS,
        FILTER_GROUP_LABEL,
        safeGetItem,
        safeSetItem,
        setupLocationPanel,
    };
})();
