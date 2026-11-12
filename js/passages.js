/* Chunky — bundled passage library.
   Each passage: id, title, category, difficulty, length tier, text, questions.
   Question `at` is the approximate fraction through the text where the answer lives (0–1),
   used to scope quizzes for timed sessions that only cover part of a passage.
   `why` is the one-line explanation shown after answering. */

const PASSAGES = [
  // ---------- SHORT / EASY ----------
  {
    id: 'bees',
    title: 'The Hidden Life of Bees',
    category: 'science',
    difficulty: 'easy',
    length: 'short',
    text: "Bees are often mistaken for simple workers, but their societies are among the most organized on Earth. In a single hive, tens of thousands of bees share labor with astonishing precision. Scout bees fly out to search for flowers, then return to the hive and perform a waggle dance, a figure-eight wiggle that encodes the direction and distance of rich patches of nectar. Other bees memorize the dance and fly straight to the blooms. The hive is also a democracy of sorts: when a swarm splits off to found a new colony, scouts publicly debate competing nest sites, and the swarm collectively settles on the best option. Honeybees can even be trained to recognize human faces. Understanding how they communicate could help us build better robots, design smarter networks, and protect the pollinators our farms quietly depend on.",
    questions: [
      { q: "What does a scout bee's waggle dance encode?", options: ['The age of the hive', 'Direction and distance of food', 'Which bees get to mate', 'The health of the queen'], answer: 1, at: 0.35, why: 'The passage says the figure-eight wiggle encodes direction and distance to nectar.' },
      { q: 'How does a swarm choose a new nest site?', options: ['The queen decides alone', 'Scouts debate and collectively agree', 'Workers draw lots', 'The eldest scout wins'], answer: 1, at: 0.68, why: 'Scouts publicly debate competing sites and the swarm settles on the best option.' },
      { q: 'Why might studying bee communication matter?', options: ['It could cure colony collapse directly', 'It may inspire robots and smarter networks', 'It proves bees understand language', 'It makes honey taste better'], answer: 1, at: 0.9, why: 'The passage lists better robots, smarter networks, and pollinator protection.' },
    ],
  },
  {
    id: 'yawn',
    title: 'Why We Yawn',
    category: 'psychology',
    difficulty: 'easy',
    length: 'short',
    text: "Yawning is one of the most contagious behaviors we know, yet scientists still debate why we do it. The oldest theory says yawning boosts alertness by increasing blood flow and briefly opening the airways when the brain grows drowsy. A newer idea argues yawning is a cooling system, dropping brain temperature when it runs too warm during long, boring, or stressful tasks. Contagious yawning, on the other hand, seems tied to empathy: people who score higher on empathy tests yawn more in response to other people yawning. Even chimpanzees and dogs catch our yawns across species lines. Some researchers view contagious yawning as a subtle social glue that helps synchronize a group's alertness. Whatever the reason, yawning is far more than a signal of boredom. It is a small, ancient broadcast that our brains are listening to more closely than we realize.",
    questions: [
      { q: 'According to the cooling theory, why do we yawn?', options: ['To stretch the jaw', 'To lower brain temperature', 'To get more oxygen into the lungs', 'To signal we are bored'], answer: 1, at: 0.35, why: 'The cooling theory says yawning drops brain temperature when it runs warm.' },
      { q: 'Contagious yawning appears linked to what trait?', options: ['Intelligence', 'Athleticism', 'Empathy', 'Introversion'], answer: 2, at: 0.55, why: 'People who score higher on empathy tests catch yawns more readily.' },
      { q: 'What do yawns spreading across species suggest to researchers?', options: ['It may act as social glue', 'All animals dream the same dreams', 'Yawning is learned, not innate', 'Species mimic each other on purpose'], answer: 0, at: 0.78, why: 'Some researchers see contagious yawning as social glue that synchronizes alertness.' },
    ],
  },
  {
    id: 'coffee',
    title: 'The Chemistry in Your Cup',
    category: 'everyday science',
    difficulty: 'easy',
    length: 'short',
    text: "Every cup of coffee is the end of a long, violent journey. A coffee cherry is harvested, depulped, washed, dried, rested, and then roasted at nearly two hundred degrees Celsius. Inside each bean, Maillard reactions, the same chemistry that browns bread, forge hundreds of new flavor compounds. Grinding the beans exposes fragile oils that begin to evaporate within minutes, which is why good baristas grind to order. Brewing then extracts roughly four hundred different compounds: acids brighten, sugars round out the edges, bitter phenols add backbone, and volatile aromas create the smell that wakes a house at dawn. Water temperature, grind size, and contact time all decide which compounds end up in the cup. Espresso extracts in about thirty seconds, while a French press steeps for four minutes, trading speed for body. Coffee is not so much a drink as a timed chemical negotiation, and every parameter is a lever the brewer can pull.",
    questions: [
      { q: "Which reactions forge coffee's roasted flavor compounds?", options: ['Fermentation', 'Caramelization alone', 'Maillard reactions', 'Photosynthesis'], answer: 2, at: 0.3, why: 'Maillard reactions, the same ones that brown bread, create the roasted flavors.' },
      { q: 'Why do good baristas grind beans to order?', options: ['Whole beans are illegal to sell', 'Exposed oils evaporate quickly', 'Grinding releases caffeine in waves', 'Old grounds taste too sweet'], answer: 1, at: 0.45, why: 'Grinding exposes fragile oils that begin evaporating within minutes.' },
      { q: 'Compared with espresso, a French press…', options: ['Extracts faster', 'Steeps longer and trades speed for body', 'Produces a thinner cup', 'Uses cold water exclusively'], answer: 1, at: 0.75, why: 'Espresso takes about thirty seconds; a French press steeps four minutes for body.' },
    ],
  },
  {
    id: 'spacing',
    title: 'The Uncomfortable Science of Studying',
    category: 'psychology',
    difficulty: 'easy',
    length: 'short',
    text: "Most students study by rereading their notes, and most students are wrong about how well that works. Rereading feels productive because the material becomes familiar, but familiarity is not recall. In 1885, Hermann Ebbinghaus mapped the forgetting curve and found that memory decays steeply within hours unless it is refreshed. A century of experiments has since produced two robust fixes. The spacing effect says that the same total study time produces far more durable memory when it is split across days instead of crammed into one sitting. The testing effect says that trying to retrieve an answer, even badly, strengthens memory more than reading the answer again. A third trick, interleaving, mixes related topics so the brain must repeatedly choose the right approach instead of executing one groove. Together they explain why the least comfortable study session is often the one that teaches the most. Learning is not the feeling of fluency. It is the work of reconstruction.",
    questions: [
      { q: 'Why is rereading misleading?', options: ['It takes too long', 'Familiarity feels like mastery but is not recall', 'It only works for numbers', 'It prevents sleep'], answer: 1, at: 0.2, why: 'The passage says familiarity is not recall, even though it feels productive.' },
      { q: 'What does the spacing effect say?', options: ['Study only at night', 'The same time spread across days is more durable', 'Longer sessions always win', 'Breaks erase memory'], answer: 1, at: 0.5, why: 'Splitting the same total time across days beats cramming it into one sitting.' },
      { q: 'Interleaving forces the brain to do what?', options: ['Repeat one skill perfectly', 'Choose the right approach repeatedly', 'Memorize in silence', 'Avoid all feedback'], answer: 1, at: 0.78, why: 'Mixing topics means choosing the right approach instead of running one groove.' },
    ],
  },
  {
    id: 'woodwide',
    title: 'The Forest Is a Market',
    category: 'nature',
    difficulty: 'easy',
    length: 'short',
    text: "A forest floor is not a collection of separate trees. Thread-like fungi called mycorrhizae wrap around roots and extend far beyond them, trading water and minerals for the sugars plants make in daylight. Because one fungal network can connect many trees, researchers call the result a mycorrhizal network, and popular writing calls it the wood wide web. Experiments with labeled carbon suggest that resources can move between connected plants, sometimes from older trees to shaded seedlings. The metaphor has since outrun the evidence. Recent reviews argue that many carbon-transfer results cannot be distinguished from fungi simply feeding themselves, and that labeling a large tree a mother nurturing its young is storytelling rather than measurement. What is not in dispute is stranger and more useful: nearly every land plant depends on fungi to feed it, and the partnership is older than roots themselves. The forest is a market, not a family, and the currency is sugar.",
    questions: [
      { q: 'What do mycorrhizal fungi trade with plants?', options: ['Seeds for pollen', 'Water and minerals for sugars', 'Light for carbon dioxide', 'Insects for nitrogen'], answer: 1, at: 0.22, why: 'Fungi supply water and minerals; plants supply sugars made in daylight.' },
      { q: 'Why is the "mother tree" idea contested?', options: ['Trees do not produce carbon', 'Carbon transfer may just be fungi feeding themselves', 'Fungi cannot connect two trees', 'Seedlings never need help'], answer: 1, at: 0.65, why: 'Reviews argue the results cannot be distinguished from fungi feeding themselves.' },
      { q: 'What does the passage say is not in dispute?', options: ['Trees communicate in sentences', 'Almost all land plants depend on fungi', 'Old trees sacrifice themselves', 'Fungal networks are conscious'], answer: 1, at: 0.85, why: 'The partnership itself is certain, even if the family story is not.' },
    ],
  },
  {
    id: 'throttle',
    title: 'Why Your Phone Slows Down',
    category: 'technology',
    difficulty: 'easy',
    length: 'short',
    text: "Your phone rarely slows down because it is old. It slows down because it is hot. Every processor has two speeds: a brief peak that benchmarks love, and a sustained rate it can hold without cooking itself. Run a game or a long video call and the chip generates more heat than the fanless body can shed, so the system lowers clock speed to protect the battery and the screen. That is thermal throttling, and it can cut performance by half within minutes. Reviewers now measure sustained performance precisely because a thirty-second benchmark hides this. Batteries add a second limit: as lithium cells age, their internal resistance rises, and a phone may cap voltage to avoid sudden shutdowns. Cold weather, a thick case, and charging while gaming all push the same lever. The practical fix is unglamorous: fewer overlapping tasks, a case off during heavy use, and a battery replacement after two or three years.",
    questions: [
      { q: 'What is thermal throttling?', options: ['Deleting old files', 'Lowering clock speed to avoid overheating', 'Charging more slowly at night', 'Compressing photos'], answer: 1, at: 0.35, why: 'The chip slows down so the fanless body can shed the heat it generates.' },
      { q: 'Why can short benchmarks mislead?', options: ['They measure only battery life', 'They capture peak speed, not sustained speed', 'They run on older phones', 'They skip the screen'], answer: 1, at: 0.5, why: 'A thirty-second test shows the peak, then throttling cuts performance.' },
      { q: 'What does an aging battery do?', options: ['Raises internal resistance and can cap voltage', 'Increases screen brightness', 'Removes the need for cooling', 'Makes the chip larger'], answer: 0, at: 0.68, why: 'Rising resistance can force voltage caps to prevent sudden shutdowns.' },
    ],
  },

  // ---------- MEDIUM ----------
  {
    id: 'printing',
    title: 'The Machine That Multiplied Ideas',
    category: 'history',
    difficulty: 'medium',
    length: 'medium',
    text: "Before 1450, every book in Europe was copied by hand, mostly by trained scribes, and a single Bible could take one copyist close to three years. Johannes Gutenberg did not invent printing from scratch. China had used woodblock printing for centuries, and Korea had experimented with movable metal type by the 1200s. Gutenberg's breakthrough was a system: an adjustable mold that could cast identical letterforms quickly, an oil-based ink that bonded better to metal than water-based inks, a screw press powerful enough to transfer the image evenly, and, above all, interchangeable parts. Any letter could be melted down and recast into any other letter, so a printer could compose a page, print it hundreds of times, and then dissolve the type for the next job. The economics were revolutionary. A single print shop could produce more pages in a month than a monastery could in a decade. Within fifty years of the Gutenberg Bible, presses had spread to more than two hundred European cities, and an estimated twenty million books had been printed. Literacy climbed, vernacular languages standardized, and ideas from the Reformation to the scientific revolution moved faster than any authority could quietly contain them. The printing press was, in effect, the first internet: cheap, durable, and impossible to unring.",
    questions: [
      { q: "Which combination made Gutenberg's press practical?", options: ['Steam power and iron plates', 'Castable letterforms, oil ink, and a screw press', 'Paper, movable clay type, and ink from squid', 'Hand calligraphy plus mechanical rollers'], answer: 1, at: 0.4, why: 'The passage lists the mold, oil ink, screw press, and interchangeable parts as one system.' },
      { q: 'Roughly how many books were printed within fifty years of the Gutenberg Bible?', options: ['Two hundred thousand', 'Two million', 'Twenty million', 'Two hundred million'], answer: 2, at: 0.62, why: 'The passage cites an estimated twenty million books within fifty years.' },
      { q: 'According to the passage, the printing press is compared to what?', options: ['The steam engine', 'The library of Alexandria', 'The first internet', 'The telegraph'], answer: 2, at: 0.88, why: 'It calls the press the first internet: cheap, durable, and impossible to unring.' },
    ],
  },
  {
    id: 'memorypalace',
    title: 'The Memory Palace',
    category: 'psychology',
    difficulty: 'medium',
    length: 'medium',
    text: "Memory athletes can memorize the order of a shuffled deck of cards in under a minute. Their secret is an ancient technique called the method of loci, or the memory palace. You begin by choosing a familiar place, say your childhood home, and you walk through it in a fixed, habitual route: front door, hallway, kitchen, garden. To remember a list of items, you place each one, vividly and absurdly, along that route. A giant two of hearts is plastered across the front door. A steaming pot of borscht bubbles on the hallway runner. The stranger and more multisensory the image, the stickier the memory. Later, to recall the list, you simply walk the route in your mind and read off what you placed there. The technique works because it hijacks two systems the brain handles well: spatial navigation and image-based episodic memory. Studies show that after weeks of loci training, novices outperform control groups on word-recall tests by large margins, with brain scans revealing connectivity changes that persist after training stops. In a culture of infinite search boxes and phone reminders, the memory palace is a reminder that attention is the scarce resource, and placement is the oldest filing system we have.",
    questions: [
      { q: 'What is the first step in the method of loci?', options: ['Memorizing a deck of cards', 'Choosing a familiar place and route', 'Drawing a detailed floor plan', 'Repeating a list aloud'], answer: 1, at: 0.18, why: 'You start with a familiar place and a fixed, habitual route through it.' },
      { q: 'Why does the technique work, according to the passage?', options: ['It hijacks spatial navigation and image-based memory', 'It strengthens the prefrontal cortex directly', 'It relies on rhythm and rhyme', 'It bypasses short-term memory entirely'], answer: 0, at: 0.68, why: 'It borrows two systems the brain already handles well: space and imagery.' },
      { q: 'What did brain scans of trainees reveal?', options: ['Visible shrinkage of the hippocampus', 'Connectivity changes that persist after training', 'No measurable difference from controls', 'Only temporary blood flow changes'], answer: 1, at: 0.8, why: 'Scans showed connectivity changes that persisted after training stopped.' },
    ],
  },
  {
    id: 'vents',
    title: 'The Dark Forest Beneath the Waves',
    category: 'nature',
    difficulty: 'medium',
    length: 'medium',
    text: "Two miles down in the Pacific, sunlight never arrives, yet entire cities of life thrive around hydrothermal vents. These vents spew mineral-rich water superheated to over three hundred degrees Celsius. Instead of photosynthesis, the ecosystem runs on chemosynthesis: bacteria harvest energy from hydrogen sulfide and other chemicals, then serve as the base of a food chain unlike anything on land. Giant tubeworms, which have no mouth and no gut, host these bacteria inside their bodies and swap nutrients for shelter. Eyeless shrimp swarm the chimney walls, scaly-foot snails plate their shells with iron sulfide, and crabs pick through bacterial mats like busy ranchers. The vents are temporary, often active for only a few decades before their chemistry changes, which forces vent animals to gamble constantly on locating the next hot spring. Larvae drift on deep currents, following chemical plumes the way moths follow light. Many biologists believe life on Earth may have begun at such vents, where chemical energy, raw organic molecules, and mineral compartments supplied everything a first cell could need. Every expedition to these black smokers is a visit to a working rehearsal for the origin of life.",
    questions: [
      { q: 'What powers the vent ecosystem instead of photosynthesis?', options: ['Geothermal light', 'Chemosynthesis by bacteria', 'Falling organic snow from above', 'Currents from surface reefs'], answer: 1, at: 0.25, why: 'Bacteria harvest chemical energy from hydrogen sulfide and other compounds.' },
      { q: 'How do giant tubeworms get their nutrients?', options: ['They filter plankton from the water', 'They host bacteria that feed them', 'They hunt small crabs', 'They absorb minerals directly'], answer: 1, at: 0.42, why: 'With no mouth or gut, they house bacteria and trade nutrients for shelter.' },
      { q: 'Why do vent animals constantly gamble on finding new vents?', options: ['Vents are active only a few decades', 'Predators drive them from chimneys', 'Oxygen disappears periodically', 'Their shells dissolve over time'], answer: 0, at: 0.66, why: 'Vents often last only decades before their chemistry changes.' },
    ],
  },
  {
    id: 'alexandria',
    title: 'The Library That Was Not Burned',
    category: 'history',
    difficulty: 'medium',
    length: 'medium',
    text: "The Library of Alexandria is remembered as the greatest archive of the ancient world and as a single tragic fire. Both halves of that memory are wrong. Founded by the Ptolemies around 300 BCE, the library was part of a larger research institution called the Musaeum, and its ambition was genuinely imperial: agents were sent to buy books, and ships docking in the harbor were searched for scrolls that could be copied and kept. Papyrus does not last forever in a humid climate, so the collection was always being recopied, an expense that depended on royal patronage. That patronage is where the story turns. Ptolemy VIII purged the city's scholars in the second century BCE, driving many away. Roman intervention damaged the complex, and Caesar's fire in 48 BCE burned part of the collection, though not all of it. Subsequent neglect, budget cuts, and waves of civic violence did the rest. By late antiquity the library had decayed rather than vanished. The single-fire story is appealing because it gives decline a villain, but institutions usually die of a thousand small defundings.",
    questions: [
      { q: 'What was the Musaeum?', options: ['A temple to the Muses and a research institution', 'A ship used to collect scrolls', 'A type of papyrus', 'A Roman library'], answer: 0, at: 0.22, why: 'The library was part of the Musaeum, a larger research institution.' },
      { q: "What actually damaged the library over time?", options: ['A single fire destroyed everything', 'Purges, war damage, neglect, and funding cuts', 'Flooding from the harbor', 'The invention of paper'], answer: 1, at: 0.7, why: 'The passage lists purges, Caesar\'s partial fire, neglect, and lost patronage.' },
      { q: "Why is the single-fire story appealing, according to the author?", options: ['It is historically precise', 'It gives decline a clear villain', 'It was written by Caesar', 'It explains the papyrus trade'], answer: 1, at: 0.92, why: 'A single fire is a simpler story than a long institutional decay.' },
    ],
  },
  {
    id: 'gps',
    title: 'The Clock in Your Pocket',
    category: 'science',
    difficulty: 'medium',
    length: 'medium',
    text: "Your phone knows where you are because of about thirty-one satellites, each carrying an atomic clock accurate to a few billionths of a second. Each satellite broadcasts the time and its own position. Your receiver notes when each signal arrived, multiplies the travel time by the speed of light, and gets a distance. Three distances would locate you on a sphere; a fourth solves for the receiver's own clock error, which is why a fix needs four satellites. The engineering is stranger than the geometry. Because the satellites move fast and sit higher in Earth's gravity well, relativity makes their clocks run about thirty-eight microseconds per day faster than clocks on the ground. Left uncorrected, that drift would add roughly ten kilometers of error every day, so the clocks are deliberately slowed before launch. The atmosphere bends signals too, and the ionosphere's delay is estimated with a model and a second frequency. GPS is therefore not a map in the sky but a continuous experiment in timekeeping, and its accuracy is a tribute to physicists who never expected to be in the navigation business.",
    questions: [
      { q: 'Why does a GPS fix need four satellites rather than three?', options: ['To cover the whole sky', 'The fourth corrects the receiver clock error', 'Three are backups', 'The fourth measures altitude only'], answer: 1, at: 0.4, why: 'Three distances fix a point; the fourth solves the receiver\'s clock error.' },
      { q: 'How much do satellite clocks drift per day without correction?', options: ['About 38 microseconds fast', 'About 38 seconds slow', 'They do not drift', 'About one hour fast'], answer: 0, at: 0.58, why: 'Relativity makes them run about thirty-eight microseconds per day fast.' },
      { q: 'What would that drift do if uncorrected?', options: ['Nothing measurable', 'Add about ten kilometers of error per day', 'Break the satellites', 'Slow the speed of light'], answer: 1, at: 0.72, why: 'The passage says the drift would add roughly ten kilometers of error daily.' },
    ],
  },

  // ---------- HARD / LONG ----------
  {
    id: 'attention',
    title: 'The Attention Economy',
    category: 'technology',
    difficulty: 'hard',
    length: 'long',
    text: "Every notification badge and autoplay feed exists because human attention has become a harvested resource. Economists once modeled information abundance as making attention infinitely divisible. They were wrong. Attention is finite, measurable in seconds, and directly convertible into advertising revenue, which makes it one of the few commodities that is also the product. Platforms compete not for your satisfaction but for your next fixation, because dwell time is the meter that advertisers pay against. Tristan Harris, a former design ethicist at a major social network, describes the mechanism as a slot machine: variable rewards, unpredictable content, intermittent reinforcement, and no natural stopping cue. The result is not just wasted time. Chronic partial attention fragments working memory, degrades deep reading, and shifts the reward baseline of the brain so that ordinary, uninterrupted thought feels understimulating. There is an asymmetry of sophistication at play. Teams of PhD-level persuasion architects design hooks against a single user's unaided willpower. Regulation is struggling to catch up, with early attempts at data portability, algorithmic audits, and duty-of-care rules all still embryonic. The deeper question is not whether attention can be stolen, but whether we will demand interfaces that return our attention to us the way a tool returns the hammer to the hand: heavy, honest, and ready for deliberate work. Until then, the most radical act available to a reader is a single uninterrupted hour.",
    questions: [
      { q: 'Why does the passage say attention is a harvested resource?', options: ['It is infinite but hard to measure', 'It is finite, measurable, and convertible to ad revenue', 'It is legally unregulated worldwide', 'It renews itself during sleep'], answer: 1, at: 0.18, why: 'Attention is limited, countable in seconds, and sells advertising.' },
      { q: 'Which mechanism does Tristan Harris compare the feed to?', options: ['A vending machine', 'A slot machine', 'A casino buffet', 'A pinball game'], answer: 1, at: 0.4, why: 'Variable rewards and no stopping cue make the feed a slot machine.' },
      { q: 'What is the asymmetry of sophistication the passage describes?', options: ['Users are smarter than designers expect', 'Expert persuasion teams face unarmed user willpower', 'Regulators outnumber platform employees', 'Algorithms are simpler than they appear'], answer: 1, at: 0.66, why: 'Teams of PhD designers build hooks against one user\'s unaided willpower.' },
      { q: "What does the author call the 'most radical act available to a reader'?", options: ['Quitting social media forever', 'An uninterrupted hour', 'Deleting all apps', 'Analog note-taking'], answer: 1, at: 0.9, why: 'The closing line names one uninterrupted hour as the radical act.' },
    ],
  },
  {
    id: 'antibiotics',
    title: 'The Invisible War Against Bacteria',
    category: 'science',
    difficulty: 'hard',
    length: 'long',
    text: "In 1928, Alexander Fleming returned from holiday to find a mold had contaminated one of his petri dishes and was clearing a halo in the surrounding bacterial lawn. Penicillin went on to save an estimated half a billion lives. Yet the weapon Fleming discovered is now being dismantled by its own success. Bacteria reproduce every twenty minutes, and every reproduction is a dice roll for mutations. Any microbe that happens to shrug off a drug survives and multiplies, which means every course of antibiotics ever prescribed has functioned as a selection event. Agriculture accelerates the pressure, since roughly two-thirds of all antibiotics sold globally are fed to livestock, not to sick humans, largely to promote growth and prevent crowd disease. Resistance spreads faster than discovery: only a handful of genuinely new antibiotic classes have reached patients since the 1980s, while resistance cascades through gene-sharing networks carried on plasmids, letting harmless species bequeath immunity to lethal ones. The World Health Organization now lists antimicrobial resistance among the ten most serious threats to human health, with projections of ten million annual deaths by 2050 if unchecked. Containment demands three fronts at once: stewardship in clinics, bans on growth-promotant use in farming, and economic pull incentives, because antibiotics are deliberately used rarely, they generate little profit for the companies that invent them. The post-antibiotic era is not a hypothetical. It arrived quietly, one incomplete prescription at a time.",
    questions: [
      { q: 'Why do antibiotics paradoxically enable their own obsolescence?', options: ['They directly mutate their own molecules', 'Every dose is a selection event for resistant microbes', 'They strengthen the human immune system too much', 'Bacteria learn to cooperate after exposure'], answer: 1, at: 0.3, why: 'Surviving microbes multiply, so each course selects for resistance.' },
      { q: 'How much of global antibiotic sales go to livestock, per the passage?', options: ['About one quarter', 'About half', 'Roughly two-thirds', 'Nearly all'], answer: 2, at: 0.42, why: 'The passage states roughly two-thirds are fed to livestock.' },
      { q: 'How do harmless bacteria help dangerous ones become resistant?', options: ['They release enzymes that shield the lethal species', 'They pass resistance genes on plasmids', 'They absorb antibiotics meant for them', 'They mutate twenty times faster in crowds'], answer: 1, at: 0.62, why: 'Plasmids let harmless species pass resistance genes to lethal ones.' },
      { q: 'Why have pharmaceutical companies stopped developing new antibiotic classes?', options: ['Hospitals prescribe them too eagerly', 'They are used rarely, so profits are poor', 'Governments ban them in clinics', 'The science is considered solved'], answer: 1, at: 0.82, why: 'Deliberately rare use means little revenue for the companies that invent them.' },
    ],
  },
  {
    id: 'romanroads',
    title: 'The Roads That Built Rome',
    category: 'history',
    difficulty: 'hard',
    length: 'long',
    text: "The Roman Empire built roughly four hundred thousand kilometers of roads, about eighty thousand of them paved, enough to circle the equator ten times. These roads were not symbolic grandeur. They were strategic infrastructure, designed for the rapid movement of legions, imperial mail, tax grain, and later Christian missionaries and plague. Construction was methodical: surveyors chose the straightest viable line with a groma, engineers dug a foundation trench, layered crushed stone, gravel, and sand, then topped it with tightly fitted polygonal slabs. Crown camber drained rainwater to side ditches, and milestones marked every mille passus, a thousand paces. Maintenance was a legal obligation of local communities, and the cursus publicus, the state courier relay with fresh horses every twenty to thirty kilometers, could move a message across the empire in days. The Appian Way, begun in 312 BCE, still carries traffic in places today. When the Western Empire fragmented, the roads decayed because no one paid for upkeep, and travel slowed to foot pace for centuries. Historians argue the medieval Dark Ages were partly a logistics collapse. Charlemagne repaired roads to project authority; Napoleon mapped them for artillery; Mussolini resurfaced the Appian Way for propaganda. Control of roads has always been control of time, and whoever controls time controls the territory the time crosses.",
    questions: [
      { q: 'What was the primary purpose of Roman roads?', options: ['Trade with China along the Silk Road', 'Rapid movement of legions and imperial mail', 'Religious pilgrimage routes', 'Scenic display for citizens'], answer: 1, at: 0.12, why: 'They were strategic infrastructure for troops, mail, and tax grain.' },
      { q: 'What did the groma do for Roman surveyors?', options: ['Measured road depth', 'Chose the straightest viable line', 'Compressed the final paving slabs', 'Tracked distance between milestones'], answer: 1, at: 0.33, why: 'Surveyors used the groma to pick the straightest practical route.' },
      { q: 'What is the cursus publicus?', options: ['A tax on road maintenance', 'The state courier relay with fresh horses', 'A public assembly of milestone markers', 'A league of road-building engineers'], answer: 1, at: 0.52, why: 'It was the imperial relay that swapped horses every twenty to thirty kilometers.' },
      { q: 'According to the passage, why did travel slow to a foot pace after Rome fell?', options: ['Roads were deliberately destroyed by invaders', 'No one maintained the roads', 'Horses went extinct in Europe', 'Trade routes moved to the sea'], answer: 1, at: 0.72, why: 'Roads decayed because upkeep stopped being paid for.' },
      { q: "What is the author's central claim about roads?", options: ["They were the empire's greatest expense", 'Whoever controls roads controls time and territory', 'They proved Rome was peaceful', 'They were better than modern highways'], answer: 1, at: 0.9, why: 'The closing line ties road control to control of time and territory.' },
    ],
  },
  {
    id: 'ewaste',
    title: 'The Mountain in the Drawer',
    category: 'technology',
    difficulty: 'hard',
    length: 'long',
    text: "The world generated about sixty-two million tonnes of electronic waste in 2022, according to the Global E-waste Monitor, and only about a fifth of it was formally collected and recycled. The rest was dumped, burned, or left to accumulate in drawers and storerooms, which makes e-waste the fastest-growing solid waste stream on the planet. The material is not merely trash. A tonne of circuit boards contains more gold than a tonne of gold ore, along with copper, silver, palladium, and the rare earths that make magnets and screens work. Yet recovery is economically awkward: devices are glued, soldered, and sealed, so dismantling them costs more than the recovered metal is worth at current prices. Much of the informal recycling happens in low-income countries, where workers heat boards over open fires to melt solder and strip wire, exposing themselves and their communities to lead, mercury, and brominated flame retardants. The design decisions that make a phone feel premium are the same ones that make it nearly impossible to repair. Regulators are responding unevenly with right-to-repair laws, extended producer responsibility schemes, and deposit programs, but the deeper fix is upstream: devices built to be opened, batteries that can be replaced with a screwdriver, and software support that lasts longer than the hardware's novelty. The most sustainable phone, the industry likes to say, is the one you already own. Making that sentence true is a design problem, not a recycling problem.",
    questions: [
      { q: 'How much e-waste was generated in 2022, and how much was formally recycled?', options: ['20 million tonnes; half was recycled', '62 million tonnes; about a fifth was recycled', '100 million tonnes; most was recycled', '62 million tonnes; nearly all was recycled'], answer: 1, at: 0.18, why: 'The passage cites sixty-two million tonnes and about a fifth formally recycled.' },
      { q: 'Why is recovering metals from electronics economically awkward?', options: ['The metals are worthless', 'Devices are glued and sealed, so dismantling costs more than the metal is worth', 'Recycling is illegal in most countries', 'Circuit boards contain no gold'], answer: 1, at: 0.45, why: 'Sealed designs make dismantling cost more than the recovered material returns.' },
      { q: 'What risk does informal recycling create?', options: ['Too many jobs', 'Exposure to lead, mercury, and flame retardants', 'Lower metal prices', 'Faster device production'], answer: 1, at: 0.62, why: 'Open-fire melting exposes workers and communities to toxic metals.' },
      { q: 'What does the author call the deeper fix?', options: ['Shipping waste abroad', 'Designing devices that can be opened and repaired', 'Banning all electronics', 'Burning waste for energy'], answer: 1, at: 0.85, why: 'The passage frames repairable design as the real solution, not recycling.' },
    ],
  },
];
