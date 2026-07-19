// Test para validar la lógica de matcheo de género
// Ejecutar con: npx ts-node src/__tests__/genderMatch.test.ts

interface User {
  id: string;
  name: string;
  gender: string | null;
  seeking_gender: string[];
}

// Casos de prueba
const testCases = [
  // Ambos buscan hombre, ambos hombres → deben verse
  {
    name: "Hombre→Hombre, ambos buscan hombre",
    userA: { id: "1", name: "A", gender: "man", seeking_gender: ["man"] },
    userB: { id: "2", name: "B", gender: "man", seeking_gender: ["man"] },
    expectedAseesB: true,
    expectedBseesA: true,
  },
  // A busca hombre y mujer, A es hombre → debe ver a B (hombre)
  {
    name: "A busca ambos, B busca hombre",
    userA: { id: "1", name: "A", gender: "man", seeking_gender: ["man", "woman"] },
    userB: { id: "2", name: "B", gender: "man", seeking_gender: ["man"] },
    expectedAseesB: true,
    expectedBseesA: true,
  },
  // A busca mujer, B busca hombre → no deben verse
  {
    name: "A busca mujer, B busca hombre",
    userA: { id: "1", name: "A", gender: "man", seeking_gender: ["woman"] },
    userB: { id: "2", name: "B", gender: "man", seeking_gender: ["man"] },
    expectedAseesB: false,
    expectedBseesA: false,
  },
  // A no tiene preferencia, B busca hombre → deben verse
  {
    name: "A sin preferencia, B busca hombre",
    userA: { id: "1", name: "A", gender: "man", seeking_gender: [] },
    userB: { id: "2", name: "B", gender: "man", seeking_gender: ["man"] },
    expectedAseesB: true,
    expectedBseesA: true,
  },
  // A busca hombre, B no tiene preferencia → deben verse
  {
    name: "A busca hombre, B sin preferencia",
    userA: { id: "1", name: "A", gender: "man", seeking_gender: ["man"] },
    userB: { id: "2", name: "B", gender: "man", seeking_gender: [] },
    expectedAseesB: true,
    expectedBseesA: true,
  },
  // Mujer busca hombre, Hombre busca mujer → deben verse
  {
    name: "Mujer busca hombre, Hombre busca mujer",
    userA: { id: "1", name: "A", gender: "woman", seeking_gender: ["man"] },
    userB: { id: "2", name: "B", gender: "man", seeking_gender: ["woman"] },
    expectedAseesB: true,
    expectedBseesA: true,
  },
];

// Función que simula la lógica de la query
function seesUser(me: User, candidate: User): boolean {
  const myGender = me.gender;
  const mySeeking = me.seeking_gender.length === 0 ? ["man", "woman", "other"] : me.seeking_gender;
  const theirGender = candidate.gender;
  const theirSeeking = candidate.seeking_gender.length === 0 ? ["man", "woman", "other"] : candidate.seeking_gender;

  // Debo estar en lo que ellos buscan Y ellos deben estar en lo que yo busco
  return myGender !== null && theirGender !== null && 
    theirSeeking.includes(myGender!) && 
    mySeeking.includes(theirGender!);
}

console.log("🧪 Tests de Matcheo de Género\n");
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const aSeesB = seesUser(tc.userA, tc.userB);
  const bSeesA = seesUser(tc.userB, tc.userA);
  
  const aPass = aSeesB === tc.expectedAseesB;
  const bPass = bSeesA === tc.expectedBseesA;
  
  if (aPass && bPass) {
    console.log(`✅ ${tc.name}`);
    passed++;
  } else {
    console.log(`❌ ${tc.name}`);
    console.log(`   A→B: ${aSeesB} (esperado: ${tc.expectedAseesB})`);
    console.log(`   B→A: ${bSeesA} (esperado: ${tc.expectedBseesA})`);
    failed++;
  }
}

console.log(`\n📊 Resultados: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
