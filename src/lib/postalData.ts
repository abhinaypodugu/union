/**
 * Indian Postal Hierarchy Directory
 * Circles (States) -> Divisions (Districts/Cities) -> Offices Employed (SO, HPO, GPO, BO)
 */

export interface PostalDirectoryMap {
 [circle: string]: {
  [division: string]: string[];
 };
}

export const POSTAL_DIRECTORY: PostalDirectoryMap = {
 Telangana: {
  Secunderabad: [
   'Sitaphalmandi SO',
   'Secunderabad HPO',
   'Trimulgherry SO',
   'Begumpet SO',
   'Malkajgiri SO',
   'Bolarum SO',
   'Bowenpally SO',
   'Marredpally SO',
   'Tarnaka SO',
   'Alwal SO',
   'Kacheguda SO',
   'Musheerabad SO',
   'Karkhana SO',
   'Safilguda SO',
   'Neredmet SO',
   'Yapral SO',
   'Padmarao Nagar SO',
   'A.S. Rao Nagar SO',
   'Kushaiguda SO',
   'ECIL SO',
  ],
  'Hyderabad City': [
   'Hyderabad GPO',
   'Khairatabad HPO',
   'Jubilee Hills SO',
   'Banjara Hills SO',
   'Sanjeeva Reddy Nagar SO',
   'Humayun Nagar SO',
   'Chanchalguda SO',
   'Charminar SO',
   'Amberpet SO',
   'Golkonda SO',
   'Kukatpally SO',
   'Miyapur SO',
   'Gachibowli SO',
   'Cyberabad SO',
   'Dilsukhnagar SO',
   'L.B. Nagar SO',
   'Mehdipatnam SO',
   'Somajiguda SO',
  ],
  Warangal: [
   'Warangal HPO',
   'Hanamkonda SO',
   'Kazipet SO',
   'Subedari SO',
   'Jangaon SO',
   'Mahabubabad SO',
   'Narsampet SO',
   'Parkal SO',
   'Thorrur SO',
  ],
  Karimnagar: [
   'Karimnagar HPO',
   'Jagtial SO',
   'Peddapalli SO',
   'Godavarikhani SO',
   'Sircilla SO',
   'Korutla SO',
   'Huzurabad SO',
   'Manthani SO',
  ],
  Nizamabad: [
   'Nizamabad HPO',
   'Kamareddy SO',
   'Bodhan SO',
   'Armoor SO',
   'Banswada SO',
   'Yellareddy SO',
  ],
  Khammam: [
   'Khammam HPO',
   'Kothagudem SO',
   'Bhadrachalam SO',
   'Yellandu SO',
   'Madhira SO',
   'Sathupally SO',
  ],
  Mahabubnagar: [
   'Mahabubnagar HPO',
   'Gadwal SO',
   'Wanaparthy SO',
   'Nagarkurnool SO',
   'Shadnagar SO',
   'Jadcherla SO',
   'Narayanpet SO',
  ],
  Nalgonda: [
   'Nalgonda HPO',
   'Suryapet SO',
   'Miryalaguda SO',
   'Bhongir SO',
   'Devarakonda SO',
   'Kodad SO',
   'Choutuppal SO',
  ],
  Medak: [
   'Sangareddy HPO',
   'Medak SO',
   'Siddipet HPO',
   'Patancheru SO',
   'Zaheerabad SO',
   'Gajwel SO',
  ],
  Adilabad: [
   'Adilabad HPO',
   'Mancherial SO',
   'Nirmal SO',
   'Bellampalli SO',
   'Mandamarri SO',
   'Asifabad SO',
  ],
 },
 'Andhra Pradesh': {
  Vijayawada: [
   'Vijayawada HPO',
   'Buckinghampet SO',
   'Governorpet SO',
   'Gannavaram SO',
   'Machilipatnam HPO',
   'Gudivada HPO',
   'Nuzvid SO',
  ],
  Visakhapatnam: [
   'Visakhapatnam HPO',
   'Waltair SO',
   'Gajuwaka SO',
   'Anakapalle HPO',
   'Steel Plant SO',
   'MVP Colony SO',
   'Simhachalam SO',
  ],
  Tirupati: [
   'Tirupati HPO',
   'Tirumala SO',
   'SV University SO',
   'Renigunta SO',
   'Chittoor HPO',
   'Madanapalle HPO',
   'Srikalahasti SO',
  ],
  Guntur: [
   'Guntur HPO',
   'Arundelpet SO',
   'Brodipet SO',
   'Tenali HPO',
   'Narasaraopet HPO',
   'Bapatla HPO',
   'Mangalagiri SO',
  ],
  Kurnool: [
   'Kurnool HPO',
   'Nandyal HPO',
   'Adoni HPO',
   'Dhone SO',
   'Yemmiganur SO',
   'Allagadda SO',
  ],
  Rajahmundry: [
   'Rajahmundry HPO',
   'Aryapuram SO',
   'Kakinada HPO',
   'Amalapuram HPO',
   'Tuni SO',
   'Samalkot SO',
  ],
  Nellore: [
   'Nellore HPO',
   'Kavali HPO',
   'Gudur HPO',
   'Venkatagiri SO',
   'Atmakur SO',
  ],
  Anantapur: [
   'Anantapur HPO',
   'Hindupur HPO',
   'Guntakal HPO',
   'Dharmavaram SO',
   'Kadiri SO',
  ],
 },
 Karnataka: {
  'Bengaluru East': [
   'Bengaluru GPO',
   'Indiranagar SO',
   'HAL SO',
   'Whitefield SO',
   'KR Puram SO',
   'Vimanapura SO',
  ],
  'Bengaluru South': [
   'Jayanagar HPO',
   'Basavanagudi HPO',
   'Koramangala SO',
   'JP Nagar SO',
   'Electronic City SO',
   'Bannerghatta SO',
  ],
  'Bengaluru West': [
   'Rajajinagar HPO',
   'Malleswaram HPO',
   'Yeshwanthpur SO',
   'Vijayanagar SO',
   'Peenya SO',
  ],
  Mysuru: [
   'Mysuru HPO',
   'Saraswathipuram SO',
   'Vontikoppal SO',
   'Chamundipuram SO',
   'Nanjangud HPO',
  ],
  Hubballi: [
   'Hubballi HPO',
   'Dharwad HPO',
   'Vidyanagar SO',
   'Railway Colony SO',
   'Navanagar SO',
  ],
  Mangaluru: [
   'Mangaluru HPO',
   'Hampankatta SO',
   'Kankanady SO',
   'Surathkal SO',
   'Udupi HPO',
  ],
 },
 Maharashtra: {
  'Mumbai City': [
   'Mumbai GPO',
   'Kalbadevi HPO',
   'Girgaon SO',
   'Colaba SO',
   'Nariman Point SO',
   'Fort SO',
  ],
  'Mumbai South': [
   'Dadar HPO',
   'Worli SO',
   'Parel SO',
   'Byculla SO',
   'Prabhadevi SO',
  ],
  'Pune City': [
   'Pune HPO',
   'Shivajinagar HPO',
   'Deccan Gymkhana SO',
   'Kothrud SO',
   'Hadapsar SO',
   'Aundh SO',
  ],
  'Nagpur City': [
   'Nagpur GPO',
   'Sitabuldi SO',
   'Dharampeth SO',
   'Itwari HPO',
   'Sadar SO',
  ],
 },
 Delhi: {
  'New Delhi Central': [
   'New Delhi GPO',
   'Parliament Street HPO',
   'Connaught Place SO',
   'Indraprastha SO',
   'Baroda House SO',
  ],
  'Delhi North': [
   'Delhi GPO',
   'Civil Lines SO',
   'Kamla Nagar SO',
   'Model Town SO',
   'Tis Hazari SO',
  ],
  'Delhi South': [
   'Hauz Khas SO',
   'Kalkaji SO',
   'Saket SO',
   'Nehru Place SO',
   'Malviya Nagar SO',
  ],
 },
 'Tamil Nadu': {
  'Chennai Central': [
   'Chennai GPO',
   'Anna Salai HPO',
   'T Nagar HPO',
   'Mylapore HPO',
   'Triplicane SO',
  ],
  Coimbatore: [
   'Coimbatore HPO',
   'RS Puram SO',
   'Gandhipuram SO',
   'Saibaba Colony SO',
   'Peelamedu SO',
  ],
  Madurai: [
   'Madurai HPO',
   'Tallakulam SO',
   'Tirunagar SO',
   'Pasumalai SO',
   'Simmakkal SO',
  ],
 },
};

export const POSTAL_CIRCLES = Object.keys(POSTAL_DIRECTORY);

export function getDivisionsForCircle(circle: string): string[] {
 const norm = Object.keys(POSTAL_DIRECTORY).find(
  (c) => c.toLowerCase() === circle.toLowerCase().replace(/circle/i, '').trim()
 );
 if (!norm || !POSTAL_DIRECTORY[norm]) {
  return ['Secunderabad', 'Hyderabad City', 'Warangal', 'Karimnagar', 'Nizamabad'];
 }
 return Object.keys(POSTAL_DIRECTORY[norm]);
}

export function getOfficesForDivision(circle: string, division: string): string[] {
 const normCircle = Object.keys(POSTAL_DIRECTORY).find(
  (c) => c.toLowerCase() === circle.toLowerCase().replace(/circle/i, '').trim()
 );
 if (!normCircle || !POSTAL_DIRECTORY[normCircle]) {
  return [
   'Sitaphalmandi SO',
   'Secunderabad HPO',
   'Trimulgherry SO',
   'Begumpet SO',
   'Malkajgiri SO',
   'Bolarum SO',
   'Hyderabad GPO',
  ];
 }
 const circleData = POSTAL_DIRECTORY[normCircle];
 const normDiv = Object.keys(circleData).find(
  (d) => d.toLowerCase() === division.toLowerCase().replace(/division/i, '').trim()
 );
 if (!normDiv || !circleData[normDiv]) {
  // If division not explicitly matched, aggregate all offices in this circle
  const allInCircle = Object.values(circleData).flat();
  return allInCircle.slice(0, 30);
 }
 return circleData[normDiv];
}
