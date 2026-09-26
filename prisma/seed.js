require('dotenv').config();
const prisma = require('../src/lib/prisma');

async function main() {
  const tests = [
    ['CBC', 'Complete Blood Count'],
    ['TSH', 'Thyroid Stimulating Hormone'],
    ['LIPID', 'Lipid Profile'],
    ['LFT', 'Liver Function Test'],
    ['KFT', 'Kidney Function Test'],
    ['HBA1C', 'HbA1c'],
    ['VIT-D', 'Vitamin D'],
    ['URINE-RM', 'Urine Routine & Microscopy']
  ];

  const testRecords = {};
  for (const [code, name] of tests) {
    testRecords[code] = await prisma.diagnosticTest.upsert({
      where: { code },
      update: { name },
      create: { name, code }
    });
  }

  const centres = [
    {
      name: 'City Diagnostics',
      location: 'Sector 18, Greater Noida, Uttar Pradesh',
      tests: { CBC: 450, TSH: 600, LIPID: 750, LFT: 650, KFT: 600, HBA1C: 500, 'VIT-D': 1200, 'URINE-RM': 250 }
    },
    {
      name: 'Dr Lal PathLabs - Greater Noida',
      location: 'Sector 18, Greater Noida, Uttar Pradesh',
      tests: { CBC: 450, TSH: 550, LIPID: 750, LFT: 650, KFT: 600, HBA1C: 500, 'VIT-D': 1200, 'URINE-RM': 250 }
    },
    {
      name: 'Metropolis Healthcare - Noida',
      location: 'Sector 62, Noida, Uttar Pradesh',
      tests: { CBC: 480, TSH: 600, LIPID: 800, LFT: 700, KFT: 650, HBA1C: 550, 'VIT-D': 1100, 'URINE-RM': 275 }
    }
  ];

  for (const centreData of centres) {
    const centre = await prisma.diagnosticCentre.upsert({
      where: { name: centreData.name },
      update: { location: centreData.location },
      create: { name: centreData.name, location: centreData.location }
    });

    for (const [code, price] of Object.entries(centreData.tests)) {
      await prisma.centreTest.upsert({
        where: { centreId_testId: { centreId: centre.id, testId: testRecords[code].id } },
        update: { price },
        create: { centreId: centre.id, testId: testRecords[code].id, price }
      });
    }

    console.log(`Seeded centre: ${centre.name}`);
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
