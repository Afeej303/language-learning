export function schedule(old,correct,now=Date.now()){
 const card=old||{reps:0,days:0,ease:2.5};
 const reps=correct?card.reps+1:0;
 const days=reps<=1?1:reps===2?6:Math.round(card.days*card.ease);
 return {reps,days,ease:Math.max(1.3,Math.min(3,card.ease+(correct?0.1:-0.32))),due:now+days*86400000};
}
export function dueCards(cards,bank,now=Date.now()){
 return bank.filter(q=>q.skill==='vocabulary'&&cards[q.id]?.due<=now).sort((a,b)=>cards[a.id].due-cards[b.id].due);
}
