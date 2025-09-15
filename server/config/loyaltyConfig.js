export const tiers = [
  { name: "Sprout", minPoints: 0 },
  { name: "Seedling", minPoints: 100 },
  { name: "Cultivator", minPoints: 500 },
  { name: "Bloom", minPoints: 1000 },
  { name: "Harvester", minPoints: 2000 }
];

export const earningRules = {
  perPeso: 1, //  1 point per $1 spent
  bonusCategories: {
    "Fertilizer": 2 // double points on Fertilizer products
  }
};

export const rewards = [
  { name: "5% Discount", cost: 100 },
  { name: "Free Product Sample", cost: 250 },
  { name: "10% Discount", cost: 500 }
];