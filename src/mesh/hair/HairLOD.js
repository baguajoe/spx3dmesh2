function getHairCards(group) {
  const cards = [];
  group?.traverse((obj) => {
    if (obj?.isMesh && (obj.name || "").toLowerCase().includes("hair_card")) cards.push(obj);
  });
  return cards;
}

export function applyHairLOD(group, ratio = 1) {
  const cards = getHairCards(group);
  const keepEvery = Math.max(1, Math.round(1 / Math.max(0.05, ratio)));
  cards.forEach((card, i) => {
    card.visible = ratio >= 0.99 ? true : i % keepEvery === 0;
  });
  group.userData.lodRatio = ratio;
  return { cards: cards.length, visible: cards.filter(c => c.visible).length };
}
