import { tiers, earningRules } from "../config/loyaltyConfig.js";

export const calculatePoints = (order) => {
  let points = 0;

  order.products.forEach((item) => {
    const basePoints = item.price * item.quantity * earningRules.perPeso;

    //  Bonus points for special categories
    if (item.productName && earningRules.bonusCategories[item.productName]) {
      points += basePoints * earningRules.bonusCategories[item.productName];
    } else {
      points += basePoints;
    }
  });

  return Math.floor(points);
};

export const getTier = (points) => {
  let tier = "Sprout";
  for (let t of tiers) {
    if (points >= t.minPoints) tier = t.name;
  }
  return tier;
};