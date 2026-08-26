import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding TrenchLine PostgreSQL database...');

  // 1. Create Default Admin / Demo User
  const hashedPassword = await bcrypt.hash('trenchline2026', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'commander@trenchline.org' },
    update: {},
    create: {
      email: 'commander@trenchline.org',
      name: 'Crusade Commander Valerius',
      password: hashedPassword,
    },
  });

  console.log(`User created: ${demoUser.email}`);

  // 2. Create Sample Warband
  const sampleWarband = await prisma.warband.upsert({
    where: { id: 'wb-seed-1' },
    update: {},
    create: {
      id: 'wb-seed-1',
      name: '3rd Holy Trench Lancers',
      factionId: 'new-antioch',
      ducatLimit: 700,
      treasuryDucats: 45,
      gloryPoints: 12,
      notes: 'Veteran trench vanguard of the Antioch Front.',
      userId: demoUser.id,
      units: [
        {
          id: 'u-1',
          customName: 'Lieutenant Valerius',
          baseProfileId: 'na-lieutenant',
          profileSnapshot: {
            id: 'na-lieutenant',
            name: 'New Antioch Lieutenant',
            factionId: 'new-antioch',
            category: 'Leader',
            baseCost: 90,
            stats: { movement: '6"', ranged: '+1', melee: '+2', armour: '+2', keywords: ['Leader', 'Tactician', 'Tough'] },
            innateAbilities: []
          },
          equippedWeapons: [{ id: 'service-rifle', name: 'Standard Issue Bolt-Action Rifle', type: 'Ranged', range: '24"', modifiers: '+0', damage: 'Standard (1 Wound)', keywords: ['Reliable', 'Bayonet Lug'], cost: 15, hands: 2, instanceId: 'w-1' }],
          equippedArmour: [{ id: 'standard-trench-armour', name: 'Standard Infantry Breastplate & Stahlhelm', armourModifier: '+1 Armour', cost: 10, keywords: ['Basic Protection'], description: 'Steel plates', instanceId: 'a-1' }],
          equippedEquipment: [],
          xp: 4,
          advancements: ['+1 Melee'],
          injuries: ['Lost Eye (-1 RNG)'],
          isDead: false,
          totalCost: 115,
          currentWounds: 3,
          maxWounds: 3,
          bloodMarkers: 0,
          status: 'Active',
          hasActedThisTurn: false
        }
      ]
    },
  });

  console.log(`Warband seeded: ${sampleWarband.name}`);

  // 3. Create Sample Campaign
  const sampleCampaign = await prisma.campaign.upsert({
    where: { inviteCode: 'TRENCH-7749' },
    update: {},
    create: {
      name: 'The Siege of Antioch Sector IV',
      inviteCode: 'TRENCH-7749',
      adminId: demoUser.id,
      status: 'active',
      currentTurn: 3,
      maxWarbandDucats: 700,
      gloryVictoryThreshold: 25,
      territories: {
        create: [
          {
            name: 'North Trench Sector A-1',
            type: 'Trench Line',
            controlledByWarbandId: sampleWarband.id,
            controlledByPlayerName: 'Commander Valerius',
            perk: '+5 Ducats supply bonus per round',
            description: 'Heavily fortified firing step overlooking the crater field.'
          },
          {
            name: 'Shrine of the Weeping Martyr',
            type: 'Ruined Shrine',
            perk: 'Reroll 1 failed Morale check per match',
            description: 'Shattered marble chapel providing divine reassurance.'
          },
          {
            name: 'The Iron Foundry Bunker',
            type: 'Munitions Bunker',
            perk: 'Free Frag Grenade in Warband Stash after each game',
            description: 'Underground armory depot filled with unexploded ordinance.'
          },
          {
            name: "Dead Man's Crater (Center)",
            type: "No Man's Land",
            perk: '+2 Glory on Victory when defending',
            description: 'Contested central wasteland strewn with barbed wire and ruined tanks.'
          }
        ]
      }
    },
  });

  console.log(`Campaign seeded: ${sampleCampaign.name} (${sampleCampaign.inviteCode})`);
  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
