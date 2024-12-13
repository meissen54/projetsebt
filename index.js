var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
const session = require('express-session');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('front'));

// Configurer express-session
app.use(session({
    secret: 'projetsebt',  // Clé secrète pour signer la session
    resave: false,  // Ne pas sauvegarder la session si rien ne change
    saveUninitialized: true,  // Sauvegarder une session même si elle est vide
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }  // Définir à true si vous utilisez HTTPS
}));

// Middleware pour vérifier si l'utilisateur est authentifié
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();  // Si l'utilisateur est connecté, continuer
    } else {
        res.redirect('/login');  // Sinon, rediriger vers la page de connexion
    }
}

// Connexion à la base de données "Database"
mongoose.connect('mongodb://192.168.137.1:27017/Database')
    .then(() => {
        console.log("Connecté à la base de données 'Database'");

        // Lancer la route d'accueil après la connexion réussie
        app.get("/", (req, res) => {
            res.send("Server connection to 'Database' is successful");
        });

        // Route pour afficher la page sign_up
        app.get("/sign_up", (req, res) => {
            res.sendFile(__dirname + '/front/sign.html');
        });

        // Route pour afficher la page login
        app.get("/login", (req, res) => {
            res.sendFile(__dirname + '/front/login.html');
        });

        // Route pour afficher la page d'accueil après la connexion
        app.get("/dash", isAuthenticated, (req, res) => {
            console.log("user ID: " + req.session.user._id);
            res.sendFile(__dirname + '/front/accueillog.html');
        });

        app.get("/search_buses", (req, res) => {
            res.sendFile(__dirname + '/front/acceuil.html');
        });

        app.get("/add_reservation", isAuthenticated, (req, res) => {
            res.sendFile(__dirname + '/front/booking.html');
        });

// Définir le schéma pour les utilisateurs
    const userSchema = new mongoose.Schema({
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        tel: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        cin: { type: String, required: true, unique: true },
        password: { type: String, required: true }
    }, { timestamps: true });

    // Exporter le modèle
    module.exports = mongoose.model('User', userSchema);

        // Définir le modèle de la collection bus
        const busSchema = new mongoose.Schema({
            depart: { type: String, required: true },
            arrive: { type: String, required: true },
            nbre_places: { type: Number, required: true },
            date_dep: { type: Date, required: true },
            heure_dep: { type: String, required: true },
            matricule:{type:String,required:true},
            prix:{type:Number,required:true,unique:true}
        });

        const Bus = mongoose.model('Bus', busSchema);

        // Route pour ajouter un bus à la collection "bus"
        app.post("/add_bus", async (req, res) => {
            try {
                var { depart, arrive, nbre_places, date_dep, heure_dep,matricule,prix} = req.body;
                const busData = { depart, arrive, nbre_places, date_dep, heure_dep,matricule,prix};

                // Créer un nouveau bus et l'insérer dans la collection "bus"
                const newBus = new Bus(busData);
                await newBus.save();
                console.log("Bus ajouté avec succès : ", newBus);
                res.send("Bus ajouté avec succès !");
            } catch (err) {
                res.status(500).send("Erreur lors de l'ajout du bus.");
                console.log(err);
            }
        });

        // Route pour la recherche de bus
        app.get("/search_bus", async (req, res) => {
            const { depart, arrive } = req.query;

            if (!depart || !arrive) {
                return res.status(400).send("Veuillez sélectionner un départ et une arrivée valides.");
            }

            try {
                const results = await Bus.find({ depart, arrive });
                if (results.length === 0) {
                    return res.json({ message: "Aucun bus trouvé pour cette recherche." });
                }

                res.json({ results });
            } catch (err) {
                console.error("Erreur lors de la recherche :", err);
                res.status(500).json({ message: "Erreur serveur." });
            }
        });

        // Route pour l'inscription
        app.post("/sign_up", async (req, res) => {
            const { firstname, lastname, tel, email, cin, password } = req.body;

            const data = {
                firstname, lastname, tel, email, cin, password
            };

            try {
                // Ajouter l'utilisateur à la collection "users"
                await mongoose.connection.collection('users').insertOne(data);
                console.log("Enregistrement inséré avec succès");
                res.send("Utilisateur ajouté avec succès !");
            } catch (err) {
                res.status(500).send("Erreur lors de l'ajout de l'utilisateur.");
                console.log(err);
            }
        });

        // Route pour la connexion (login)
        app.post("/login", async (req, res) => {
            const { email, password } = req.body;

            try {
                const user = await mongoose.connection.collection('users').findOne({ email });

                if (!user) {
                    return res.status(404).send("Utilisateur non trouvé.");
                }

                if (user.password === password) {
                    // Créer une session pour l'utilisateur
                    req.session.user = user;
                    console.log("Bienvenue !!!");
                    res.redirect("/dash");
                } else {
                    res.status(401).send("Mot de passe incorrect.");
                }
            } catch (err) {
                res.status(500).send("Erreur lors de la recherche de l'utilisateur.");
                console.log(err);
            }
        });

        // Route de déconnexion
        app.post('/logout', isAuthenticated, (req, res) => {
            req.session.destroy((err) => {
                if (err) {
                    return res.status(500).send('Erreur lors de la déconnexion.');
                }
                res.redirect("/sign_up");
            });
        });

        // Modèle de réservation
        const reservationSchema = new mongoose.Schema({
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', // Référence à l'utilisateur
                required: true
            },
            busmatricule: {
                type:String,
                required:true
            },
            depart: {
                type: String,
                required: true
            },
            arrivee: {
                type: String,
                required: true
            },
            nbrePlacesReservees: {
                type: Number,
                required: true
            },
            numeroCarte: {
                type: Number,
                required: true
            },
            codeCarte: {
                type: Number,
                required: true
            },
            dateReservation: {
                type: Date,
                default: Date.now
            },
            isScanned: { type: Boolean, default: false } 
        });

        const Reservation = mongoose.model('Reservation', reservationSchema);

        // Route pour ajouter une réservation
       // Route pour ajouter une réservation
       app.post('/add_reservation', async (req, res) => {
        const { busmatricule, depart, arrivee, nbre_places_reservees, numeroCarte, codeCarte } = req.body;
        const userId = req.session.user ? req.session.user._id : null; // Récupérer l'ID de l'utilisateur à partir de la session
    
        if (!userId) {
            return res.status(400).json({ success: false, message: "Utilisateur non connecté." });
        }
    
        try {
            console.log('Matricule du bus:', busmatricule);
            console.log('Départ:', depart);
            console.log('Arrivée:', arrivee);
            // Recherche du bus avec le matricule donné dans la base de données
            const bus = await Bus.findOne({ matricule: busmatricule });
            console.log('Recherche du bus avec matricule:', busmatricule); // Ajout du log pour vérifier le matricule
            if (!bus) {
                return res.status(404).json({ success: false, message: "Bus introuvable." });
            }
    
            // Vérifier le nombre de places disponibles
            if (bus.nbre_places < nbre_places_reservees) {
                return res.status(400).json({ success: false, message: "Nombre de places insuffisant." });
            }
    
            // Créer une nouvelle réservation
            const reservation = new Reservation({
                userId,
                busmatricule,
                depart,
                arrivee,
                nbrePlacesReservees: nbre_places_reservees,
                numeroCarte,
                codeCarte
            });
    
            const savedReservation = await reservation.save(); // Sauvegarder la réservation dans la collection "Reservation"
    
            // Réduire le nombre de places disponibles dans le bus
            bus.nbre_places -= nbre_places_reservees;
            await bus.save(); // Sauvegarder le bus mis à jour
            return res.redirect(`/generate_ticket/${reservation._id}`);
        } catch (err) {
            console.error("Erreur lors de la réservation:", err);
            res.status(500).json({ success: false, message: "Erreur serveur. Veuillez réessayer." });
        }
    });
    


       const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Route pour générer le ticket
        app.get('/generate_ticket/:ticketId', async (req, res) => {
            const ticketId = req.params.ticketId;

            try {
                // Récupérer les informations de la réservation
                const reservation = await Reservation.findById(ticketId).populate('userId').exec();

                if (!reservation) {
                    return res.status(404).send('Réservation introuvable.');
                }

                // Récupérer les informations utilisateur et de la réservation
                const { userId, depart, arrivee, nbrePlacesReservees, dateDepart, createdAt } = reservation;
                const { firstname, lastname, tel } = userId;
                const prix = 20; // Exemple de prix par place
                const totalPrix = nbrePlacesReservees * prix;
                const temps = new Date().toLocaleString(); // Date et heure actuelles

                // Générer le QR code avec des informations du ticket
                const qrCodeData = `TicketID: ${ticketId}\nNom: ${firstname} ${lastname}\nTel: ${tel}\nDépart: ${depart}\nArrivée: ${arrivee}\nPrix: ${totalPrix} DT\nPlaces: ${nbrePlacesReservees}`;
                const qrCodeImagePath = path.join(__dirname, 'tickets', `qrcode_${ticketId}.png`);
                await QRCode.toFile(qrCodeImagePath, qrCodeData);

                // Chemin pour le fichier PDF
                const ticketPath = path.join(__dirname, 'tickets', `ticket_${ticketId}.pdf`);

                // Créer le fichier PDF
                const doc = new PDFDocument({
                    size: 'A5',
                    margins: { top: 20, bottom: 20, left: 20, right: 20 }
                });
                const stream = fs.createWriteStream(ticketPath);
                doc.pipe(stream);

                // Ajouter un cadre
                doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20)
                .lineWidth(2)
                .stroke('#000');

                // Contenu du ticket
                doc.fontSize(20).text('TICKET DE RESERVATION', { align: 'center' });
                doc.moveDown();

                // Informations utilisateur
                doc.fontSize(14).text(`Nom: ${firstname} ${lastname}`, { align: 'center' });
                doc.text(`Téléphone: ${tel}`, { align: 'center' });
                doc.moveDown();

                // Informations sur le bus et la réservation
                doc.text(`Départ: ${depart}`, { align: 'center' });
                doc.text(`Arrivée: ${arrivee}`, { align: 'center' });
                doc.text(`Nombre de places réservées: ${nbrePlacesReservees}`, { align: 'center' });
                doc.text(`Prix total: ${totalPrix} DT`, { align: 'center' });
                doc.moveDown();

                // Ajouter le QR code au ticket
                doc.image(qrCodeImagePath, {
                    fit: [100, 100],
                    align: 'center',
                    valign: 'center',
                });

                doc.end();

                stream.on('finish', () => {
                    return res.sendFile(ticketPath);
                });

                stream.on('error', (err) => {
                    console.error('Erreur lors de la génération du ticket:', err);
                    return res.status(500).send('Erreur lors de la génération du ticket.');
                });
            } catch (err) {
                console.error('Erreur lors de la récupération des informations:', err);
                return res.status(500).send('Erreur serveur.');
            }
        });

        // Route pour marquer le QR code comme scanné
       app.post('/scan_ticket', async (req, res) => {
    const { reservationId } = req.body;

    try {
        // Trouver la réservation correspondante
        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({ message: 'Réservation non trouvée' });
        }

        if (reservation.isScanned) {
            return res.status(400).json({ message: 'Ce ticket a déjà été scanné' });
        }

        // Marquer le ticket comme scanné
        reservation.isScanned = true;
        await reservation.save();

        res.json({ message: 'Ticket scanné avec succès' });
    } catch (err) {
        console.error('Erreur serveur:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

       

    })
    .catch((err) => {
        console.log("Erreur de connexion à la base de données 'Database':", err);
    });

// Lancement de l'application sur le port 3000
app.listen(3000, '192.168.137.1', () => {
    console.log("En écoute sur http://192.168.137.1:3000");
});
