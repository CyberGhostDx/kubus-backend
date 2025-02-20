function haversine(cor_1: [number, number], cor_2: [number, number]) {
  let [lat1, lon1] = cor_1;
  let [lat2, lon2] = cor_2;
  const R = 6371;

  const toRad = (angle: number) => (angle * Math.PI) / 180;

  lat1 = toRad(lat1);
  lon1 = toRad(lon1);
  lat2 = toRad(lat2);
  lon2 = toRad(lon2);

  // Haversine formula
  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in km
}

export default haversine;
