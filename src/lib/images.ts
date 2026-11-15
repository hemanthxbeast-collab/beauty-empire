/**
 * Placeholder photography from Unsplash (https://unsplash.com/license — free for commercial use).
 * Replace with the salon's own photography via the admin dashboard (Cloudinary uploads).
 */
export function unsplash(id: string, width = 1200, height?: number) {
  const h = height ? `&h=${height}&fit=crop` : "";
  return `https://images.unsplash.com/photo-${id}?w=${width}${h}&q=80&auto=format`;
}

export const IMG = {
  // Brand / static sections
  heroBride: "1610173827043-9db50e0d8ef9",
  heroMakeup: "1773688189414-7637b9b138e1",
  heroFacial: "1570172619644-dfd03ed5d881",
  interiorBright: "1633681926022-84c23e8cb2d6",
  interiorMirrors: "1600948836101-f9ffda59d250",
  interiorWhite: "1521590832167-7bcbfaa6381f",
  interiorLounge: "1626383137804-ff908d2753a2",
  interiorSpa: "1560750588-73207b1ef5b8",
  team: "1559599101-f09722fb4948",
  serum: "1617897903246-719242758050",
  products: "1598440947619-2c35fc9aa908",

  // Bridal
  bride1: "1610047614301-13c63f00c032",
  bride2: "1600685890506-593fdf55949b",
  bride3: "1587271315307-eaebc181c749",
  bride4: "1631549424057-403e75d68e2f",
  bride5: "1684868265714-fd2300637c23",
  bride6: "1684868268327-7e5590bcfbd6",
  bride7: "1684868682581-4cac3af5b8d4",
  bride8: "1654764746225-e63f5e90facd",
  saree1: "1617627143750-d86bc21e42bb",
  saree2: "1619516388835-2b60acc4049e",
  saree3: "1641699862936-be9f49b1c38d",
  saree4: "1679006831648-7c9ea12e5807",
  saree5: "1727430228383-aa1fb59db8bf",
  mehndi1: "1505932794465-147d1f1b2c97",
  mehndi2: "1597157639073-69284dc0fdaf",

  // Services
  facialMask: "1570172619644-dfd03ed5d881",
  facialGold: "1664549761426-6a1cb1032854",
  facialTreatment: "1616394584738-fc6e612e71b9",
  facialMassage: "1731514771613-991a02407132",
  spaTreatment: "1559185590-d545a0c5a1dc",
  dropper: "1515377905703-c4788e51af15",
  hairBlowDry: "1562322140-8baeececf3df",
  hairStyling: "1580618672591-eb180b1a973f",
  hairWash: "1595476108010-b4d1f102b1b1",
  hairWash2: "1634449571010-02389ed0f9b0",
  hairCurl: "1560869713-7d0a29430803",
  hairWaves: "1629397685944-7073f5589754",
  hairBlonde: "1554519934-e32b1629d9ee",
  hairLong: "1522337360788-8b13dee7a37e",
  hairPortrait: "1594744803329-e58b31de8bf5",
  threading: "1519415387722-a1c3bbef716c",
  brows: "1567629307995-b9f33097bd30",
  lashes1: "1589710751893-f9a6770ad71b",
  lashes2: "1639629509821-c54cdd984227",
  lashes3: "1548902378-2ec44c906391",
  waxWarmer: "1677091508049-d8ae041b1582",
  waxHoney: "1696192410531-dc179772a0e8",
  massageOil: "1544161515-4ab6ce6db874",
  massageStone: "1600334129128-685c5582fd35",
  nailsPaint: "1457972729786-0411a3b2b626",
  nailsArt: "1519014816548-bf5fe059798b",
  nailsDark: "1604654894610-df63bc536371",
  nailsPastel: "1607779097040-26e80aa78e66",
  nailsNude: "1610992015732-2449b76344bc",
  makeupLips: "1487412947147-5cebf100ffc2",
  makeupFlatlay: "1512496015851-a90fb38ba796",
  makeupPalette: "1522335789203-aabd1fc54bc9",
  makeupBrushes: "1516975080664-ed2fc6a32937",
  makeupBeige: "1596462502278-27bfdc403348",
} as const;
