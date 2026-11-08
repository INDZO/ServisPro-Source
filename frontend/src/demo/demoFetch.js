import workshopArt from "../assets/hero.jpg";

const types = ["Redovan servis", "Dijagnostika", "Kočnice"].map((name, i) => ({ id: i + 1, name }));
const providers = [
  ["Demo Radionica A", "Novi Pazar", "Redovan servis i pregled vozila.", [1, 2]],
  ["Demo Radionica B", "Tutin", "Dijagnostika i pregled kočionog sistema.", [2, 3]],
  ["Demo Radionica C", "Sjenica", "Zakazivanje redovnih servisa i pregleda kočnica.", [1, 3]],
].map(([name, city, description, ids], i) => ({
  id: i + 1, userId: 101 + i, name, city, description, ids, imageUrl: workshopArt,
  averageRating: 0, reviewsCount: 0, reviews: [], workingDays: [1, 2, 3, 4, 5, 6, 0],
  workingHours: "09:00–17:00", serviceTypes: ids.map(id => types[id - 1].name),
  pib: "—", ownerFullName: "Demo tim", phoneNumber: "—", adress: "Fiktivna radionica",
}));
const cars = [{ id: 1, brandName: "Demo", modelName: "Vozilo", licensePlate: "DEMO" }];
const appointments = [];
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { "Content-Type": "application/json" },
});

export async function demoFetch(input, options = {}) {
  const url = new URL(input, window.location.origin);
  const path = url.pathname.toLowerCase();
  const query = url.searchParams;
  const method = options.method || "GET";
  if (path === "/api/publicservices" && method === "GET") {
    const term = (query.get("search") || "").trim().toLowerCase();
    const city = (query.get("city") || "").trim().toLowerCase();
    const day = query.get("workingDay");
    const ids = query.getAll("serviceTypeIds").map(Number);
    const result = providers.filter(p => (!term || (p.name + " " + p.description).toLowerCase().includes(term)) &&
      (!city || p.city.toLowerCase().includes(city)) &&
      (!day || p.workingDays.includes(Number(day))) && ids.every(id => p.ids.includes(id)));
    if (query.get("sortBy") === "name" || query.get("sortBy") === "city") {
      const field = query.get("sortBy");
      const direction = query.get("sortDirection") === "desc" ? -1 : 1;
      result.sort((a,b) => direction * a[field].localeCompare(b[field], "sr"));
    }
    const pageSize = Number(query.get("pageSize")) || 4;
    const pageNumber = Number(query.get("pageNumber")) || 1;
    const totalPages = Math.ceil(result.length / pageSize);
    return json({ items: result.slice((pageNumber - 1)*pageSize, pageNumber*pageSize), totalCount: result.length, totalPages, pageNumber, pageSize });
  }
  if (/^\/api\/publicservices\/\d+$/.test(path)) {
    const found = providers.find(p => p.id === Number(path.split("/").pop()));
    return found ? json(found) : json({ message: "Radionica nije pronađena." }, 404);
  }
  if (path === "/api/auth/usluge" && method === "GET") return json(types);
  if (path === "/api/client/cars" && method === "GET") return json(cars);
  if (/^\/api\/client\/appointments\/services\/\d+\/calendar$/.test(path))
    return json({ workingDays: [1, 2, 3, 4, 5, 6, 0], unavailableDays: [] });
  if (path === "/api/client/appointments" && method === "GET") return json(appointments);
  if (path === "/api/client/appointments" && method === "POST") {
    const data = JSON.parse(options.body || "{}");
    const provider = providers.find(p => p.id === data.serviceId && p.ids.includes(data.serviceTypeId));
    if (!provider || data.carId !== 1 || !/^\d{4}-\d\d-\d\dT00:00:00$/.test(data.appointmentDate || ""))
      return json({ message: "Proverite podatke za probni termin." }, 400);
    const record = { id: appointments.length + 1, serviceName: provider.name, status: "Pending",
      carBrand: "Demo", carModel: "Vozilo", serviceTypeName: types[data.serviceTypeId - 1].name,
      appointmentDate: data.appointmentDate, appointmentTime: data.appointmentTime };
    appointments.push(record);
    return json(record, 201);
  }
  return json({ message: "Ova radnja nije dostupna u probnom režimu." }, 403);
}
