import sqlite3 from 'sqlite3';
import {open} from 'sqlite';

let promesseConnexion = open({
    filename: process.env.DB_FILE,
    driver: sqlite3.Database
});

promesseConnexion = promesseConnexion.then((connexion) => {
    connexion.exec(
        `CREATE TABLE IF NOT EXISTS todo (
            id_todo INTEGER PRIMARY KEY,
            texte TEXT NOT NULL,
            est_coche INTEGER NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS utilisateur (
            id_utilisateur INTEGER PRIMARY KEY,
            nom_utilisateur TEXT NOT NULL UNIQUE,
            mot_de_passe TEXT NOT NULL,
            acces INTEGER NOT NULL
        );`
    )

    return connexion;
});

export {promesseConnexion}
