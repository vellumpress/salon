export type Shop = {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
};

export const SHOPS: Shop[] = [
  { id: "strand", name: "The Strand", neighborhood: "Union Square", address: "828 Broadway", lat: 40.7333, lng: -73.9908 },
  { id: "strand-uws", name: "Strand Upper West", neighborhood: "Upper West Side", address: "450 Columbus Ave", lat: 40.7845, lng: -73.974 },
  { id: "mcnally-soho", name: "McNally Jackson", neighborhood: "SoHo", address: "52 Prince St", lat: 40.7236, lng: -73.9954 },
  { id: "mcnally-seaport", name: "McNally Jackson Seaport", neighborhood: "Seaport", address: "4 Fulton St", lat: 40.7066, lng: -74.0036 },
  { id: "mcnally-rock", name: "McNally Jackson Rockefeller", neighborhood: "Midtown", address: "30 Rockefeller Plaza", lat: 40.7587, lng: -73.9787 },
  { id: "mcnally-bk", name: "McNally Jackson Downtown Brooklyn", neighborhood: "Downtown Brooklyn", address: "445 Albee Square W", lat: 40.6907, lng: -73.983 },
  { id: "mcnally-wburg", name: "McNally Jackson Williamsburg", neighborhood: "Williamsburg", address: "76 N 4th St", lat: 40.7175, lng: -73.9618 },
  { id: "three-lives", name: "Three Lives & Company", neighborhood: "West Village", address: "154 W 10th St", lat: 40.7345, lng: -74.0018 },
  { id: "housing-works", name: "Housing Works Bookstore", neighborhood: "SoHo", address: "126 Crosby St", lat: 40.7247, lng: -73.9969 },
  { id: "magic-smith", name: "Books Are Magic", neighborhood: "Cobble Hill", address: "225 Smith St", lat: 40.6847, lng: -73.9925 },
  { id: "magic-heights", name: "Books Are Magic Heights", neighborhood: "Brooklyn Heights", address: "122 Montague St", lat: 40.6952, lng: -73.9954 },
  { id: "greenlight", name: "Greenlight Bookstore", neighborhood: "Fort Greene", address: "686 Fulton St", lat: 40.687, lng: -73.9748 },
  { id: "community", name: "Community Bookstore", neighborhood: "Park Slope", address: "143 7th Ave", lat: 40.6729, lng: -73.9776 },
  { id: "center-fiction", name: "The Center for Fiction", neighborhood: "Fort Greene", address: "15 Lafayette Ave", lat: 40.6896, lng: -73.9832 },
  { id: "albertine", name: "Albertine", neighborhood: "Upper East Side", address: "972 5th Ave", lat: 40.7776, lng: -73.9635 },
  { id: "argosy", name: "Argosy Book Store", neighborhood: "Midtown", address: "116 E 59th St", lat: 40.7618, lng: -73.9689 },
  { id: "mysterious", name: "The Mysterious Bookshop", neighborhood: "Tribeca", address: "58 Warren St", lat: 40.715, lng: -74.0089 },
  { id: "word", name: "Word", neighborhood: "Greenpoint", address: "126 Franklin St", lat: 40.7298, lng: -73.9575 },
  { id: "astoria", name: "Astoria Bookshop", neighborhood: "Astoria", address: "31-29 31st St", lat: 40.7625, lng: -73.9245 },
  { id: "rizzoli", name: "Rizzoli Bookstore", neighborhood: "Nomad", address: "1133 Broadway", lat: 40.7426, lng: -73.9892 },
  { id: "powerhouse", name: "Powerhouse Arena", neighborhood: "Dumbo", address: "28 Adams St", lat: 40.7033, lng: -73.9889 },
  { id: "kinokuniya", name: "Kinokuniya", neighborhood: "Bryant Park", address: "1073 6th Ave", lat: 40.7544, lng: -73.9865 },
];

export function mapsUrl(shop: Shop) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name}, ${shop.address}, New York`)}`;
}
