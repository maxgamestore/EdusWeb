const fs = require('fs');
const path = require('path');

const PROGRAMA_FILE = path.join(__dirname, 'data', 'programa-romana.json');
const CONCEPTE_FILE = path.join(__dirname, 'data', 'concepte.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const FACUTE_FILE = path.join(__dirname, 'Acc', 'exercitii-facute.json');
const STATISTICI_FILE = path.join(__dirname, 'Acc', 'statistici.json');
const LECTII_FACUTE_FILE = path.join(__dirname, 'Acc', 'lectii-facute.json');

// ============================================================
//  CITIRE FIȘIERE
// ============================================================
function citestePrograma() {
    return JSON.parse(fs.readFileSync(PROGRAMA_FILE, 'utf-8'));
}

function citesteConcepte() {
    if (!fs.existsSync(CONCEPTE_FILE)) {
        throw new Error('Lipsește data/concepte.json. Rulează mai întâi: node genereaza-intrebari.js');
    }
    return JSON.parse(fs.readFileSync(CONCEPTE_FILE, 'utf-8'));
}

function citesteConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

function citesteFacute() {
    if (!fs.existsSync(FACUTE_FILE)) {
        fs.writeFileSync(FACUTE_FILE, JSON.stringify({ users: {} }, null, 2), 'utf-8');
    }
    return JSON.parse(fs.readFileSync(FACUTE_FILE, 'utf-8'));
}

function scrieFacute(date) {
    fs.writeFileSync(FACUTE_FILE, JSON.stringify(date, null, 2), 'utf-8');
}

function citesteStatistici() {
    if (!fs.existsSync(STATISTICI_FILE)) {
        return { users: {} };
    }
    return JSON.parse(fs.readFileSync(STATISTICI_FILE, 'utf-8'));
}

function citesteLectiiFacute() {
    if (!fs.existsSync(LECTII_FACUTE_FILE)) {
        fs.writeFileSync(LECTII_FACUTE_FILE, JSON.stringify({ users: {} }, null, 2), 'utf-8');
    }
    return JSON.parse(fs.readFileSync(LECTII_FACUTE_FILE, 'utf-8'));
}

function scrieLectiiFacute(date) {
    fs.writeFileSync(LECTII_FACUTE_FILE, JSON.stringify(date, null, 2), 'utf-8');
}

// ============================================================
//  SĂPTĂMÂNA CURENTĂ
// ============================================================
function saptamanaCurenta() {
    const config = citesteConfig();
    const start = new Date(config.start_an_scolar);
    const acum = new Date();

    for (const v of config.vacante) {
        const startV = new Date(v.start);
        const endV = new Date(v.end);
        if (acum >= startV && acum <= endV) {
            const zile = Math.floor((startV - start) / (1000 * 60 * 60 * 24));
            return Math.max(1, Math.floor(zile / 7));
        }
    }

    const zile = Math.floor((acum - start) / (1000 * 60 * 60 * 24));
    const sapt = Math.floor(zile / 7) + 1;
    return Math.min(sapt, 36);
}

// ============================================================
//  AMESTECĂ
// ============================================================
function amesteca(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ============================================================
//  EXERCIȚII ZILNICE — din conceptele slabe
// ============================================================
function alegeExercitiiZilnice(userId, numar = 5) {
    const concepte = citesteConcepte();
    const statistici = citesteStatistici();
    const sapt = saptamanaCurenta();

    const cheieStat = `user_${userId}_romana`;
    const statUser = statistici.users[cheieStat] || [];

    const procentePeConcepte = {};
    for (const s of statUser) {
        procentePeConcepte[s.id] = s.procent;
    }

    const toate = [];
    for (const id in concepte) {
        const c = concepte[id];
        const procent = procentePeConcepte[id] ?? 0;

        for (const q of c.intrebari) {
            toate.push({
                ...q,
                id: q.id || `${id}_${toate.length}`,
                concept: id,
                concept_procent: procent
            });
        }
    }

    if (toate.length === 0) {
        return { saptamana: sapt, exercitii: [] };
    }

    // Alegere ponderată — cele slabe au șanse mai mari
    const ponderi = toate.map(q => {
        const p = q.concept_procent;
        if (p < 30) return 10;
        if (p < 50) return 6;
        if (p < 70) return 3;
        return 1;
    });

    const selectate = [];
    const folosite = new Set();

    while (selectate.length < numar && folosite.size < toate.length) {
        const totalPonderi = toate.reduce((sum, q, i) => folosite.has(i) ? sum : sum + ponderi[i], 0);
        if (totalPonderi <= 0) break;
        let r = Math.random() * totalPonderi;

        for (let i = 0; i < toate.length; i++) {
            if (folosite.has(i)) continue;
            r -= ponderi[i];
            if (r <= 0) {
                selectate.push(toate[i]);
                folosite.add(i);
                break;
            }
        }
    }

    return {
        saptamana: sapt,
        exercitii: selectate
    };
}

// ============================================================
//  EXERCIȚII PENTRU O LECȚIE SPECIFICĂ (cu filtrare dificultate)
// ============================================================
function alegeExercitiiLectie(saptamana, dificultate = null) {
    const programa = citestePrograma();
    const concepte = citesteConcepte();

    const lectie = programa.saptamani.find(s => s.saptamana === saptamana);
    if (!lectie) return { lectie: null, exercitii: [] };

    let toate = [];
    for (const conceptId of lectie.concepte) {
        const c = concepte[conceptId];
        if (!c) continue;

        for (const q of c.intrebari) {
            toate.push({
                ...q,
                id: q.id || `${conceptId}_${toate.length}`,
                concept: conceptId
            });
        }
    }

    // Filtrează după dificultate dacă e specificată
    if (dificultate) {
        const difCautata = dificultate.toLowerCase();

        // Acceptă atât "usor" cât și "ușor"
        let filtrate = toate.filter(q => {
            const d = (q.dificultate || '').toLowerCase();
            if (difCautata === 'usor') return d === 'usor' || d === 'ușor';
            return d === difCautata;
        });

        // Fallback 1: dacă nu sunt întrebări cu dificultatea cerută,
        // dar sunt întrebări fără dificultate setată, folosește-le
        if (filtrate.length === 0) {
            filtrate = toate.filter(q => !q.dificultate);
        }

        // Fallback 2: dacă tot e gol, returnează toate (safety)
        if (filtrate.length === 0) {
            filtrate = toate;
        }

        toate = filtrate;
    }

    return {
        lectie: lectie.lectie,
        exercitii: amesteca(toate)
    };
}

// ============================================================
//  LISTĂ LECȚII CU NR ÎNTREBĂRI (per dificultate)
// ============================================================
function listaLectii() {
    const programa = citestePrograma();
    const concepte = citesteConcepte();

    return programa.saptamani.map(s => {
        let total = 0;
        let usor = 0, mediu = 0, greu = 0;

        for (const cId of s.concepte) {
            const c = concepte[cId];
            if (!c || !c.intrebari) continue;

            for (const q of c.intrebari) {
                total++;

                // Citire robustă a dificultății (acceptă și variante cu diacritice)
                const dif = q.dificultate || '';

                if (dif === 'usor' || dif === 'ușor') usor++;
                else if (dif === 'mediu') mediu++;
                else if (dif === 'greu') greu++;
                else usor++; // fallback: întrebările fără dificultate = ușoare
            }
        }

        return {
            saptamana: s.saptamana,
            lectie: s.lectie,
            nr_intrebari: total,
            disponibil: { usor, mediu, greu }
        };
    });
}

// ============================================================
//  MARCHEAZĂ EXERCIȚIILE CA FĂCUTE
// ============================================================
function marcheazaFacute(userId, idsExercitii) {
    const facute = citesteFacute();
    const azi = new Date().toISOString().slice(0, 10);
    const cheieUser = `user_${userId}`;

    if (!facute.users[cheieUser]) facute.users[cheieUser] = {};
    if (!facute.users[cheieUser][azi]) facute.users[cheieUser][azi] = [];

    facute.users[cheieUser][azi].push(...idsExercitii);
    scrieFacute(facute);
    return true;
}

// ============================================================
//  LECȚII FACUTE (progres per lecție + dificultate)
// ============================================================
function marcheazaLectieFacuta(userId, saptamana, dificultate, corecte, total) {
    const date = citesteLectiiFacute();
    const cheieUser = `user_${userId}`;
    if (!date.users[cheieUser]) date.users[cheieUser] = {};

    const cheieLectie = `${saptamana}_${dificultate}`;
    const procent = total > 0 ? Math.round((corecte / total) * 100) : 0;

    date.users[cheieUser][cheieLectie] = {
        saptamana,
        dificultate,
        corecte,
        total,
        procent,
        data: new Date().toISOString()
    };

    scrieLectiiFacute(date);
    return date.users[cheieUser][cheieLectie];
}

function getLectiiFacute(userId) {
    const date = citesteLectiiFacute();
    const cheieUser = `user_${userId}`;
    return date.users[cheieUser] || {};
}

// ============================================================
//  EXPORT
// ============================================================
module.exports = {
    saptamanaCurenta,
    alegeExercitiiZilnice,
    alegeExercitiiLectie,
    listaLectii,
    marcheazaFacute,
    marcheazaLectieFacuta,
    getLectiiFacute
};