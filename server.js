import 'dotenv/config';
import https from 'https';
import { readFile } from 'fs/promises';
import express, { json } from 'express';
import { engine } from 'express-handlebars';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import memorystore from 'memorystore';
import passport from 'passport';
import middlewareSse from './middleware-sse.js';
import {getTodo, addTodo, checkTodo} from './model/todo.js';
import { addUtilisateur } from './model/utilisateur.js';
import {validateContact} from './validation.js';
import './authentification.js';

// Création du serveur
let app = express();

// Ajouter l'engin handlebars dans express
app.engine('handlebars', engine({
    helpers: {
        afficheArgent: (nombre) => nombre && nombre.toFixed(2) + ' $'
        /*{
            if(nombre){
                return nombre.toFixed(2) + ' $';
            }

            return null;
        }*/
    }
}));

// Définir handlebars comme engin de rendu (génération du HTML)
app.set('view engine', 'handlebars');

// Configuration de handlebars
app.set('views', './views')

// Création du constructeur de la base de données de session
const MemoryStore = memorystore(session);

// Ajout de middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(json());
app.use(session({
    cookie: { maxAge: 1800000 },
    name: process.env.npm_package_name,
    store: new MemoryStore({ checkPeriod: 1800000 }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(middlewareSse());
app.use(express.static('public'));

// Routes
app.get('/', async (request, response) => {
    if(request.user) {
        if(request.session.countTodo === undefined) {
            request.session.countTodo = 0;
        }

        request.session.countTodo++;

        response.render('todo', {
            titre: 'Todo',
            styles: ['/css/todo.css'],
            scripts: ['/js/todo.js'],
            user: request.user,
            aAcces: request.user.acces > 0,
            todos: await getTodo(),
            accept: request.session.accept,
            count: request.session.countTodo,
            argent: 234
        });
    }
    else {
        response.redirect('/connexion');
    }
});

app.get('/apropos', (request, response) => {
    if(request.session.countAPropos === undefined) {
        request.session.countAPropos = 0;
    }

    request.session.countAPropos++;

    response.render('apropos', {
        titre: 'À propos',
        user: request.user,
        accept: request.session.accept,
        count: request.session.countAPropos
    });
});

app.get('/contact', (request, response) => {
    if(request.session.countContact === undefined) {
        request.session.countContact = 0;
    }

    request.session.countContact++;

    response.render('contact', {
        titre: 'Contact',
        styles: ['/css/contact.css'],
        scripts: ['/js/contact.js'],
        user: request.user,
        accept: request.session.accept,
        count: request.session.countContact
    });
});

app.get('/inscription', (request, response) => {
    response.render('authentification', {
        titre: 'Inscription',
        scripts: ['/js/inscription.js'],
        user: request.user,
        accept: request.session.accept
    });
});

app.get('/connexion', (request, response) => {
    response.render('authentification', {
        titre: 'Connexion',
        scripts: ['/js/connexion.js'],
        user: request.user,
        accept: request.session.accept
    });
});

app.post('/api/todo', async (request, response) => {
    if(!request.user) {
        response.status(401).end();
    }
    else if(request.user.acces <= 0) {
        response.status(403).end();
    }
    else {
        let id = await addTodo(request.body.texte);
        response.status(201).json({id: id});
        response.pushJson({
            id: id,
            texte: request.body.texte
        }, 'add-todo');
    }
});

app.patch('/api/todo', async (request, response) => {
    if(!request.user) {
        response.status(401).end();
    }
    else {
        await checkTodo(request.body.id);
        response.status(200).end();
        response.pushJson({
            id: request.body.id
        }, 'check-todo');
    }
});

app.post('/api/contact', (request, response) => {
    if(validateContact(request.body)){
        console.log(request.body);
        response.status(200).end();
    }
    else {
        console.log(request.body);
        response.status(400).end();
    }
});

app.get('/stream', (request, response) =>{
    if(request.user) {
        response.initStream();
    }
    else {
        response.status(401).end();
    }
});

app.post('/accept', (request, response) => {
    request.session.accept = true;
    response.status(200).end();
});

app.post('/inscription', async (request, response, next) => {
    // Valider les données reçu du client
    if (true){
        try{
            await addUtilisateur(request.body.nomUtilisateur, request.body.motDePasse);
            response.status(201).end();
        }
        catch(error) {
            if(error.code === 'SQLITE_CONSTRAINT') {
                response.status(409).end()
            }
            else {
                next(error);
            }
        }
    }
    else {
        response.status(400).end();
    }
});

app.post('/connexion', (request, response, next) => {
    // Valider les données reçu du client
    if (true){
        passport.authenticate('local', (error, utilisateur, info) => {
            if(error) {
                next(error);
            }
            else if(!utilisateur) {
                response.status(401).json(info);
            }
            else {
                request.logIn(utilisateur, (error) => {
                    if(error) {
                        next(error);
                    }
                    else {
                        response.status(200).end();
                    }
                })
            }
        })(request, response, next);
    }
    else {
        response.status(400).end();
    }
});

app.post('/deconnexion', (request, response, next) => {
    request.logOut((error) => {
        if(error) {
            next(error);
        }
        else {
            response.redirect('/connexion');
        }
    })
});

// Démarrer le serveur
if(process.env.NODE_ENV === 'production') {
    app.listen(process.env.PORT);
    console.log(
        'Serveur démarré: http://localhost:' + 
        process.env.PORT
    );
}
else {
    const credentials = {
        key: await readFile('./security/localhost.key'),
        cert: await readFile('./security/localhost.cert')
    }

    https.createServer(credentials, app).listen(process.env.PORT)
    console.log(
        'Serveur démarré: https://localhost:' + 
        process.env.PORT
    );
}
