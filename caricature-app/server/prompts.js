// הנחיות היצירה לכל נושא. כל נושא כולל כמה תרחישים - בכל יצירה נבחרים 4 שונים באקראי,
// ולכל תמונה גם סגנון ציור אקראי, כך שכל סיבוב יוצא שונה.

const THEME_SCENES = {
  toilet_king: [
    'sitting proudly on a giant golden toilet throne wearing a royal crown and velvet cape, holding a toilet-plunger scepter, in a lavish palace bathroom',
    'reading an enormous newspaper on the toilet with an exaggerated thinking face, surrounded by stacks of toilet paper like a fortress',
    'as a renaissance genius inventing things while seated on a marble toilet, blueprints and lightbulbs flying around',
    'conducting an orchestra of rubber ducks from a bubble-filled bathtub next to a royal toilet, wearing a shower-cap crown',
    'as a heroic explorer planting a flag on top of a mountain of toilet-paper rolls',
  ],
  superhero: [
    'as a clumsy superhero tangled in their own cape while trying to fly, crashing into a pigeon flock above a city',
    'as a superhero proudly rescuing a cat that clearly did not need rescuing, cat looking annoyed',
    'as a superhero with a tiny, ridiculous superpower: shooting confetti from fingers, at a dramatic city battle',
    'as a superhero stuck in a phone booth trying to change into the costume, limbs everywhere',
  ],
  astronaut: [
    'as a lost astronaut on the moon asking a confused alien for directions, holding an upside-down map',
    'as an astronaut floating inside a space station chasing floating spaghetti and juice bubbles',
    'as an astronaut planting a flag on Mars only to find a falafel stand already there',
    'as an astronaut taking a selfie with Saturn, helmet fogged up, rings photobombing',
  ],
  chef: [
    'as a chaotic chef in a kitchen on fire, flipping a pancake that sticks to the ceiling, flour explosion',
    'as a proud chef presenting a hilariously burnt cake with a huge confident smile',
    'as a chef being chased by an angry giant lobster around the kitchen',
    'as a chef juggling eggs, knives and a rubber chicken in a restaurant kitchen',
  ],
  rockstar: [
    'as an 80s rock star with gigantic teased hair and spandex, doing a guitar solo on a stage with exploding fireworks',
    'as a rock star stage-diving into a crowd of grandmas holding knitting needles',
    'as a heavy-metal singer screaming into a microphone shaped like a banana, wind machine blowing hair wildly',
    'as a rock star in a tiny living room playing an air-guitar concert for an unimpressed dog',
  ],
  emperor: [
    'as a Roman emperor lounging on a couch being fed grapes, wearing a laurel wreath, very dramatic expression',
    'as a classical marble statue in a museum, with a modern smartphone and sunglasses',
    'as a Roman emperor in a chariot race, but the chariot is pulled by two chubby goats',
    'as a gladiator in the Colosseum facing a tiny fluffy kitten as the opponent, crowd cheering',
  ],
  animal: [
    'with their face on the body of a fluffy chubby cat lounging on a sofa like a boss',
    'with their face on the body of a colorful parrot perched on a pirate shoulder',
    'with their face on the body of a corgi dog running happily on a beach',
    'with their face on the body of a majestic lion on Pride Rock, but with a tiny crown',
    'with their face on the body of a penguin wearing a tuxedo bow tie at a fancy party',
  ],
  baby: [
    'as a giant baby with an adult face, in a diaper, sitting in a huge high chair throwing mashed food',
    'as a baby boss in a tiny business suit with a pacifier, at a meeting with teddy bears',
    'as a giant baby crawling through a city like a cute monster, people waving',
    'as a baby in a stroller with sunglasses and a smoothie, looking very cool',
  ],
  wizard: [
    'as a confused wizard whose spell went wrong, turning the castle into jelly, frogs raining down',
    'as a wizard with a magic wand that only produces rubber ducks, very frustrated',
    'as a wizard riding a broomstick that is clearly out of control, crashing through a bakery',
    'as a wizard student in a magic school with an exploding cauldron of pink foam',
  ],
  bodybuilder: [
    'as an absurdly muscular bodybuilder with a tiny head, flexing at a beach competition, oiled and shiny',
    'as a huge bodybuilder struggling to lift a tiny feather, sweating dramatically',
    'as a bodybuilder whose muscles are so big they rip through a tiny tuxedo at a wedding',
    'as a bodybuilder doing bicep curls with two watermelons in a supermarket',
  ],
  cowboy: [
    'as a cowboy in the wild west riding a donkey backwards, lasso tangled around themself',
    'as a sheriff in a saloon showdown, but holding two bananas instead of pistols',
    'as a cowboy being thrown off a bucking horse in a rodeo, hat flying',
    'as a cowboy around a campfire singing to a group of unimpressed cacti',
  ],
  old_age: [
    'as a 90 year old version of themself, very wrinkled with huge glasses, riding a skateboard in a park',
    'as a 90 year old grumpy elder waving a cane at pigeons from a park bench',
    'as a 90 year old at a nightclub, dancing wildly with glow sticks, younger people amazed',
    'as a 90 year old knitting a giant sweater for an elephant',
  ],
};

const ART_STYLES = [
  'classic hand-drawn caricature with a huge head and small body, bold ink lines and vibrant watercolor shading',
  'polished 3D animated feature-film style render, soft cinematic lighting, subsurface skin shading',
  'detailed oil-painting caricature in the style of a funny museum portrait, rich textures and brush strokes',
  'vintage comic-book style with halftone dots, bold outlines and saturated colors',
  'claymation figurine style, handmade clay texture, miniature diorama background',
  'editorial magazine caricature, airbrushed digital painting, ultra-detailed',
];

const BASE_PROMPT = [
  'Create a hilarious, exaggerated caricature of the person in the provided photo.',
  'Keep the face clearly recognizable: preserve identity, facial structure, skin tone, hair and distinctive features, while playfully exaggerating them (bigger head, expressive eyes, big smile).',
  'Scene: {scene}.',
  'Art style: {style}.',
  'Very high quality, highly detailed, lots of small funny background details and visual gags, sharp focus, rich colors, full illustration filling the frame.',
  'Good-natured, family-friendly humor only. Nothing insulting, sexual, violent or offensive.',
  'Do not write any text, letters or captions in the image. Leave some calm space at the top and bottom of the frame.',
].join(' ');

function pickRandom(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  const out = [];
  for (let i = 0; i < n; i++) out.push(a[i % a.length]);
  return out;
}

/** מחזיר רשימת n הנחיות שונות לנושא. בנושא "random" כל תמונה מנושא אחר. */
function buildPrompts(themeId, n) {
  let scenes;
  if (themeId === 'random' || !THEME_SCENES[themeId]) {
    const themes = pickRandom(Object.keys(THEME_SCENES), n);
    scenes = themes.map((t) => ({ themeId: t, scene: pickRandom(THEME_SCENES[t], 1)[0] }));
  } else {
    scenes = pickRandom(THEME_SCENES[themeId], n).map((scene) => ({ themeId, scene }));
  }
  const styles = pickRandom(ART_STYLES, n);
  return scenes.map((s, i) => ({
    themeId: s.themeId,
    variant: styles[i],
    prompt: BASE_PROMPT.replace('{scene}', s.scene).replace('{style}', styles[i]),
  }));
}

module.exports = { buildPrompts, THEME_IDS: ['random', ...Object.keys(THEME_SCENES)] };
