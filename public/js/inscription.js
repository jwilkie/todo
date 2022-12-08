let formAuth = document.getElementById('form-auth');
let inputNomUtilisateur = document.getElementById('input-nom-utilisateur');
let inputMotDePasse = document.getElementById('input-mot-de-passe');

formAuth.addEventListener('submit', async (event) => {
    event.preventDefault();

    let data = {
        nomUtilisateur: inputNomUtilisateur.value,
        motDePasse: inputMotDePasse.value
    }

    let response = await fetch('/inscription', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });

    if(response.ok) {
        window.location.replace('/connexion');
    }
    else if(response.status === 409) {
        // Afficher message au client
        console.log('Nom utilisateur déjà utilisé');
    }
    else {
        console.log('Autre erreur');
    }
})
