const map = L.map('map', {
    center: [51.505, -0.09],
    zoom: 2
});

L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
    minZoom: 1,
    maxZoom: 20,
    subdomains: ['a', 'b', 'c'],
    attribution: 'données © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> - rendu <a href="https://openstreetmap.fr/">OSM France</a>'
}).addTo(map);

let issIcon = L.icon({
    iconUrl: './images/iss.png',
    shadowUrl: null,

    iconSize: [100, 100], // size of the icon
    shadowSize: [50, 64], // size of the shadow
    iconAnchor: [50, 50], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor: [-3, -76] // point from which the popup should open relative to the iconAnchor
});


const issPositions = [];
const issPath = L.polyline(issPositions, { color: 'red' }).addTo(map);
const issMarker = L.marker([0, 0], { icon: issIcon }).addTo(map);

setInterval(() => {
    fetch('https://api.wheretheiss.at/v1/satellites/25544')
        .then((response) => response.json())
        .then((data) => {
            console.log(data)
            const latitude = data.latitude
            const longitude = data.longitude

            issMarker.setLatLng([latitude, longitude])
            issPositions.push([latitude, longitude])

            if (issPositions.length > 500) {
                issPositions.shift()
            }

            issPath.setLatLngs(issPositions)
        })

        .catch((error) => {
            console.error("Erreur: ", error);
        })

}, 1000)

