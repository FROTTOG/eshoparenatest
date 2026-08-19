export type PointSeed = {
  carrier: "zasilkovna" | "balikovna";
  type: "zbox" | "branch" | "balikovna";
  name: string;
  address: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
  hours: string;
};

const N = "nonstop";
const STD = "Po–Pá 8:00–20:00, So 8:00–13:00";
const SHOP = "Po–Pá 9:00–18:00, So 9:00–12:00";

export const PICKUP_POINTS: PointSeed[] = [
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Praha Anděl", address: "Nádražní 23", city: "Praha", zip: "15000", lat: 50.0703, lng: 14.4047, hours: N },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Praha Florenc", address: "Křižíkova 4", city: "Praha", zip: "18600", lat: 50.0908, lng: 14.4392, hours: N },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Praha Chodov", address: "Roztylská 2321/19", city: "Praha", zip: "14800", lat: 50.0321, lng: 14.4912, hours: N },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Praha Letňany", address: "Veselská 663", city: "Praha", zip: "19900", lat: 50.1364, lng: 14.515, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Praha Vinohrady", address: "Korunní 42", city: "Praha", zip: "12000", lat: 50.0751, lng: 14.4498, hours: STD },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Praha Karlín", address: "Sokolovská 85", city: "Praha", zip: "18600", lat: 50.0934, lng: 14.4512, hours: STD },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Praha Smíchov", address: "Štefánikova 18", city: "Praha", zip: "15000", lat: 50.0742, lng: 14.4041, hours: STD },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Praha Hlavní nádraží", address: "Wilsonova 300/8", city: "Praha", zip: "11000", lat: 50.0831, lng: 14.4353, hours: "Po–Ne 6:00–22:00" },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Praha Dejvice", address: "Dejvická 27", city: "Praha", zip: "16000", lat: 50.1002, lng: 14.3945, hours: SHOP },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Brno Cejl", address: "Cejl 48", city: "Brno", zip: "60200", lat: 49.1994, lng: 16.6221, hours: N },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Brno Campus", address: "Netroufalky 770", city: "Brno", zip: "62500", lat: 49.177, lng: 16.572, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Brno Česká", address: "Česká 11", city: "Brno", zip: "60200", lat: 49.1975, lng: 16.6068, hours: STD },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Brno Líšeň", address: "Novolíšeňská 2671", city: "Brno", zip: "62800", lat: 49.207, lng: 16.686, hours: STD },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Brno hlavní nádraží", address: "Nádražní 1", city: "Brno", zip: "60200", lat: 49.1907, lng: 16.6128, hours: "Po–Ne 5:30–22:00" },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Ostrava Centrum", address: "28. října 124", city: "Ostrava", zip: "70200", lat: 49.835, lng: 18.283, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Ostrava Poruba", address: "Hlavní tř. 583", city: "Ostrava", zip: "70800", lat: 49.827, lng: 18.172, hours: STD },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Ostrava Svinov", address: "Peterkova 10", city: "Ostrava", zip: "72100", lat: 49.821, lng: 18.21, hours: SHOP },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Plzeň Náměstí", address: "nám. Republiky 1", city: "Plzeň", zip: "30100", lat: 49.747, lng: 13.377, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Plzeň Lochotín", address: "Lidická 15", city: "Plzeň", zip: "30100", lat: 49.762, lng: 13.368, hours: STD },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Plzeň hlavní nádraží", address: "nám. Českých bratří", city: "Plzeň", zip: "30100", lat: 49.743, lng: 13.388, hours: "Po–Ne 6:00–21:00" },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Liberec Fórum", address: "Soukenné nám. 669", city: "Liberec", zip: "46001", lat: 50.767, lng: 15.056, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Liberec Rochlice", address: "České mládeže 1079", city: "Liberec", zip: "46006", lat: 50.755, lng: 15.068, hours: STD },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Olomouc Šantovka", address: "Polská 1", city: "Olomouc", zip: "77900", lat: 49.588, lng: 17.264, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Olomouc Horní náměstí", address: "Horní nám. 1", city: "Olomouc", zip: "77900", lat: 49.594, lng: 17.251, hours: STD },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Olomouc hl. n.", address: "Jeremenkova 40", city: "Olomouc", zip: "77900", lat: 49.591, lng: 17.278, hours: SHOP },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX České Budějovice IGY", address: "Pražská tř. 1247", city: "České Budějovice", zip: "37004", lat: 48.981, lng: 14.474, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna České Budějovice", address: "Lannova 2", city: "České Budějovice", zip: "37001", lat: 48.975, lng: 14.476, hours: STD },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Hradec Králové Aupark", address: "Gočárova tř. 1754", city: "Hradec Králové", zip: "50002", lat: 50.209, lng: 15.825, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Hradec Králové", address: "Velké nám. 26", city: "Hradec Králové", zip: "50003", lat: 50.209, lng: 15.833, hours: STD },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Ústí nad Labem", address: "Hrnčířská 3", city: "Ústí nad Labem", zip: "40001", lat: 50.661, lng: 14.041, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Ústí nad Labem", address: "Masarykova 77", city: "Ústí nad Labem", zip: "40001", lat: 50.66, lng: 14.032, hours: STD },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Pardubice Grand", address: "třída Míru 2800", city: "Pardubice", zip: "53002", lat: 50.037, lng: 15.778, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Pardubice", address: "třída Míru 60", city: "Pardubice", zip: "53002", lat: 50.036, lng: 15.779, hours: STD },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Pardubice hl. n.", address: "nám. Jana Pernera", city: "Pardubice", zip: "53002", lat: 50.031, lng: 15.756, hours: SHOP },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Zlín Golden Apple", address: "nám. Míru 174", city: "Zlín", zip: "76001", lat: 49.227, lng: 17.667, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Zlín", address: "Dlouhá 123", city: "Zlín", zip: "76001", lat: 49.226, lng: 17.669, hours: STD },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Jihlava City Park", address: "Hradební 1", city: "Jihlava", zip: "58601", lat: 49.395, lng: 15.591, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Jihlava", address: "Masarykovo nám. 1", city: "Jihlava", zip: "58601", lat: 49.396, lng: 15.591, hours: STD },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Karlovy Vary Varyáda", address: "Jáchymovská 82", city: "Karlovy Vary", zip: "36004", lat: 50.231, lng: 12.871, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Karlovy Vary", address: "T. G. Masaryka 18", city: "Karlovy Vary", zip: "36001", lat: 50.232, lng: 12.872, hours: STD },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Kladno Central", address: "nám. Svobody 2090", city: "Kladno", zip: "27201", lat: 50.147, lng: 14.103, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Kladno", address: "T. G. Masaryka 89", city: "Kladno", zip: "27201", lat: 50.148, lng: 14.103, hours: STD },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Most Central", address: "tř. Budovatelů 1957", city: "Most", zip: "43401", lat: 50.503, lng: 13.64, hours: N },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Teplice", address: "nám. Svobody 1", city: "Teplice", zip: "41501", lat: 50.64, lng: 13.825, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Děčín", address: "Masarykovo nám. 1", city: "Děčín", zip: "40502", lat: 50.782, lng: 14.215, hours: STD },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Chomutov", address: "nám. 1. máje", city: "Chomutov", zip: "43001", lat: 50.461, lng: 13.418, hours: N },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Mladá Boleslav", address: "tř. Václava Klementa 1459", city: "Mladá Boleslav", zip: "29301", lat: 50.411, lng: 14.904, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Kolín", address: "Karlovo nám. 7", city: "Kolín", zip: "28002", lat: 50.028, lng: 15.201, hours: STD },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Příbram", address: "nám. T. G. Masaryka 1", city: "Příbram", zip: "26101", lat: 49.69, lng: 14.01, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Tábor", address: "tř. 9. května 1282", city: "Tábor", zip: "39002", lat: 49.414, lng: 14.658, hours: STD },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Písek", address: "Velké nám. 1", city: "Písek", zip: "39701", lat: 49.309, lng: 14.148, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Klatovy", address: "nám. Míru 1", city: "Klatovy", zip: "33901", lat: 49.395, lng: 13.295, hours: SHOP },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Cheb", address: "nám. Krále Jiřího z Poděbrad", city: "Cheb", zip: "35002", lat: 50.08, lng: 12.374, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Sokolov", address: "U Divadla 1", city: "Sokolov", zip: "35601", lat: 50.181, lng: 12.64, hours: STD },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Jablonec nad Nisou", address: "Komenského 4588", city: "Jablonec nad Nisou", zip: "46601", lat: 50.725, lng: 15.171, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Česká Lípa", address: "nám. T. G. Masaryka 1", city: "Česká Lípa", zip: "47001", lat: 50.686, lng: 14.538, hours: STD },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Trutnov", address: "Krakonošovo nám. 1", city: "Trutnov", zip: "54101", lat: 50.561, lng: 15.913, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Náchod", address: "Palackého 1", city: "Náchod", zip: "54701", lat: 50.417, lng: 16.163, hours: SHOP },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Havířov", address: "Hlavní třída 64", city: "Havířov", zip: "73601", lat: 49.78, lng: 18.437, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Opava", address: "Horní nám. 1", city: "Opava", zip: "74601", lat: 49.939, lng: 17.903, hours: STD },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Frýdek-Místek", address: "Zámecké nám. 1", city: "Frýdek-Místek", zip: "73801", lat: 49.685, lng: 18.348, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Karviná", address: "tř. Osvobození 1", city: "Karviná", zip: "73301", lat: 49.854, lng: 18.542, hours: STD },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Ostrava Forum Nová Karolina", address: "Jantarová 4", city: "Ostrava", zip: "70200", lat: 49.83, lng: 18.287, hours: "Po–Ne 9:00–21:00" },

  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Prostějov", address: "nám. T. G. Masaryka 1", city: "Prostějov", zip: "79601", lat: 49.472, lng: 17.112, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Přerov", address: "nám. T. G. Masaryka 1", city: "Přerov", zip: "75002", lat: 49.455, lng: 17.451, hours: STD },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Šumperk", address: "nám. Míru 1", city: "Šumperk", zip: "78701", lat: 49.965, lng: 16.971, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Kroměříž", address: "Velké nám. 1", city: "Kroměříž", zip: "76701", lat: 49.298, lng: 17.393, hours: STD },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Uherské Hradiště", address: "Masarykovo nám. 1", city: "Uherské Hradiště", zip: "68601", lat: 49.07, lng: 17.46, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Vsetín", address: "Svárov 1", city: "Vsetín", zip: "75501", lat: 49.339, lng: 17.996, hours: SHOP },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Znojmo", address: "Masarykovo nám. 1", city: "Znojmo", zip: "66902", lat: 48.856, lng: 16.049, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Třebíč", address: "Karlovo nám. 1", city: "Třebíč", zip: "67401", lat: 49.215, lng: 15.882, hours: STD },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Hodonín", address: "Národní třída 1", city: "Hodonín", zip: "69501", lat: 48.849, lng: 17.132, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Břeclav", address: "nám. T. G. Masaryka 1", city: "Břeclav", zip: "69002", lat: 48.759, lng: 16.882, hours: STD },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Blansko", address: "nám. Svobody 1", city: "Blansko", zip: "67801", lat: 49.363, lng: 16.643, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Havlíčkův Brod", address: "Havlíčkovo nám. 1", city: "Havlíčkův Brod", zip: "58001", lat: 49.608, lng: 15.581, hours: SHOP },
  { carrier: "zasilkovna", type: "zbox", name: "Z-BOX Žďár nad Sázavou", address: "nám. Republiky 1", city: "Žďár nad Sázavou", zip: "59101", lat: 49.563, lng: 15.939, hours: N },
  { carrier: "zasilkovna", type: "branch", name: "Zásilkovna Jindřichův Hradec", address: "nám. Míru 1", city: "Jindřichův Hradec", zip: "37701", lat: 49.144, lng: 15.003, hours: STD },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Brno Vaňkovka", address: "Ve Vaňkovce 1", city: "Brno", zip: "60200", lat: 49.188, lng: 16.614, hours: "Po–Ne 9:00–21:00" },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Praha Černý Most", address: "Chlumecká 765", city: "Praha", zip: "19800", lat: 50.109, lng: 14.578, hours: "Po–Ne 9:00–21:00" },
  { carrier: "balikovna", type: "balikovna", name: "Balíkovna Liberec Nisa", address: "České mládeže 456", city: "Liberec", zip: "46006", lat: 50.758, lng: 15.059, hours: SHOP },
];
