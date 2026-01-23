const map = L.map('map', {
    center: [51.505, -0.09],
    zoom: 2
});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

let issIcon = L.icon({
    iconUrl: 'iss.png',
    shadowUrl: null,

    iconSize:     [100, 100], // size of the icon
    shadowSize:   [50, 64], // size of the shadow
    iconAnchor:   [50, 50], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});


const issPositions = [];
const issPath = L.polyline(issPositions, { color: 'red' }).addTo(map);
const issMarker = L.marker([0, 0], {icon: issIcon}).addTo(map);

setInterval(() => {
    fetch('http://api.open-notify.org/iss-now.json')
    .then((response) => response.json())
    .then((data) => {
        console.log(data)
        const latitude = data.iss_position.latitude
        const longitude = data.iss_position.longitude
    
        issMarker.setLatLng([latitude, longitude])
        issPositions.push([latitude, longitude])
        issPath.setLatLngs(issPositions)
    })

    .catch((error) => {
    console.error("Erreur: ", error);
    })

}, 1000)

