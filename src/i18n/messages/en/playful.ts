// Area "playful": Playful Learning Landscapes (src/pages/playful-learning/index.astro) — the
// toolkit's own appendix on how children learn through play. PiaT's own words; keep paragraphs
// whole. Rendered at build time only (client: false). Theme names/colors come from `themes`
// (src/data/themes.ts, its own overlay) — not duplicated here.
import { defineMessages } from '../../define.ts';

export default defineMessages(
  'playful',
  {
    'title': 'Playful Learning Landscapes',
    'description':
      'An appendix for integrating Playful Learning into Park in a Truck projects — the science of how children learn best, built into everyday park design.',
    'lede': 'An appendix for integrating Playful Learning into Park in a Truck projects.',
    'originalPdf': '📄 Original expansion pack (PDF)',

    'intro1':
      'Playful Learning brings together the science of how children learn best with the design of everyday spaces. It combines the joy of play with meaningful, interactive opportunities to support child development — turning sidewalks, parks and community spaces into places where learning naturally unfolds. Grounded in developmental science, Playful Learning experiences are active, engaging, socially interactive and joyful.',
    'intro2':
      'This approach supports whole-child development: children strengthen language through storytelling, develop critical thinking through hands-on problem solving, grow confidence by exploring new ideas, and build social skills through collaboration and communication with peers and caregivers. Since children spend nearly 80% of their waking hours outside of formal classroom settings, public spaces like parks, sidewalks and plazas hold tremendous potential as platforms for learning.',
    'formulaAlt':
      "Playful Learning Landscapes' three-part design formula: a flower diagram of five principles for how children learn, a ring of six circles for the 6Cs of what children learn, and an illustration of a child and caregiver together in a park, for community engagement",

    'principlesHeading': '5 principles of learning (the how)',
    'principlesIntro': 'Playful Learning spaces are grounded in decades of research from developmental psychology and education.',
    'principles.activelyEngaging.name': 'Actively Engaging',
    'principles.activelyEngaging.text':
      'Children learn most effectively when they are physically and mentally engaged. Activities that involve movement, manipulation or experimentation promote deeper understanding.',
    'principles.meaningful.name': 'Meaningful',
    'principles.meaningful.text': "Learning sticks when it connects to a child's life experiences, interests and cultural background.",
    'principles.sociallyInteractive.name': 'Socially Interactive',
    'principles.sociallyInteractive.text':
      'Peer and caregiver interactions are critical to learning — conversation, shared tasks and collaborative exploration help children reflect, clarify and expand their thinking.',
    'principles.iterative.name': 'Iterative',
    'principles.iterative.text':
      'Children benefit from trying things out, making mistakes and trying again. Environments that allow repeated use and flexible problem-solving promote persistence and adaptive thinking.',
    'principles.joyful.name': 'Joyful',
    'principles.joyful.text':
      'Joy is not just nice — it’s necessary. When children are curious, delighted and emotionally invested, they are more likely to stay engaged and motivated to learn.',

    'sixCsHeading': 'The 6Cs framework (the what)',
    'sixCsIntro': 'Six interconnected skills children need to thrive in school, work and life — especially in the early years.',
    'sixCs.collaboration.name': 'Collaboration',
    'sixCs.collaboration.text': 'Working and playing well with others — sharing, turn-taking, negotiating, resolving conflict.',
    'sixCs.communication.name': 'Communication',
    'sixCs.communication.text': 'Expressing ideas and understanding others, through storytelling, questions, listening and explaining.',
    'sixCs.content.name': 'Content',
    'sixCs.content.text': 'Acquiring knowledge in academic and everyday domains — math, science, reading, social studies.',
    'sixCs.criticalThinking.name': 'Critical Thinking',
    'sixCs.criticalThinking.text': 'Analyzing, comparing, predicting and solving problems — sorting, multi-step prompts, puzzles.',
    'sixCs.creativeInnovation.name': 'Creative Innovation',
    'sixCs.creativeInnovation.text': 'Thinking outside the box — flexible thinking, imagination and invention.',
    'sixCs.confidence.name': 'Confidence',
    'sixCs.confidence.text': "The belief in one's ability to try, fail and try again — building resilience and curiosity.",

    'communityHeading': 'Community engagement',
    'community1':
      'Community members are involved in every step of the design process — from concept to implementation. Inviting local families, youth and educators to share their ideas and values makes Playful Learning installations more relevant, reflective and inclusive, and co-design fosters local pride and long-term stewardship.',
    'community2':
      'Playful Learning Landscapes (PLL) is a natural partner for Park in a Truck: both initiatives center equity, accessibility and community voice. PiaT turns vacant lots into parks that are easy to build, easy to maintain and rooted in local leadership; PLL adds another layer, infusing those parks with educational value and joyful experiences.',

    'elementsHeading': 'Playful learning designs for PiaT projects',
    'elements.col.element': 'Element',
    'elements.col.description': 'Description',
    'elements.col.skills': 'Key skills (6Cs)',
    'elements.shapeGames.name': 'Shape Games',
    'elements.shapeGames.text': 'Painted shapes encourage children to jump between colors and forms, fostering movement and logic.',
    'elements.iconStorytelling.name': 'Icon Storytelling',
    'elements.iconStorytelling.text': 'Children choose etched icons on gabion baskets to build stories, promoting narrative play.',
    'elements.colorTheoryTrellis.name': 'Color-Theory Trellis',
    'elements.colorTheoryTrellis.text': 'Overlapping transparent panels show how colors blend, encouraging visual experimentation.',
    'elements.sortingTables.name': 'Sorting Tables',
    'elements.sortingTables.text': 'Tables with gridded surfaces prompt sorting by shape, size or texture.',
    'elements.iSpyKeyMural.name': 'I-Spy Key Mural',
    'elements.iSpyKeyMural.text': 'A mural encourages children to search for objects around the park, boosting observation skills.',
    'elements.puzzleWall.name': 'Puzzle Wall',
    'elements.puzzleWall.text': 'Children complete a puzzle of a meaningful community image, promoting problem-solving.',
    'elements.giantRuler.name': 'Giant Ruler',
    'elements.giantRuler.text': 'A painted ruler invites children to measure themselves or objects, linking math to real-world context.',
    'elements.colorFlowerSculpture.name': 'Color Flower Sculpture',
    'elements.colorFlowerSculpture.text': 'Moveable colored petals let children mix colors through play.',
    'elements.jumpingFeet.name': 'Jumping Feet',
    'elements.jumpingFeet.text': 'A twist on hopscotch that challenges children to switch jumping styles.',
    'elements.storyWheel.name': 'Story Wheel',
    'elements.storyWheel.text': 'A spinning wheel provides prompts for children to invent stories, solo or with peers.',

    'byThemeHeading': 'Playful learning by park type',
    'byThemeIntro': "These elements adapt to fit any of PiaT's four modular park themes:",
    'byTheme.col.parkType': 'Park type',
    'byTheme.col.features': 'Recommended playful learning features',
    'byThemeNote':
      'These elements are intentionally low-cost, low-maintenance and customizable — whether activating a garden corner, a mural wall or a flexible seating area.',

    'downloadLabel': 'Playful Learning Landscapes expansion pack',
    'learnMore':
      'Learn more at <a href="https://www.playfullearninglandscapes.com" target="_blank" rel="noopener">playfullearninglandscapes.com ↗</a>, or contact the PLL team at <a href="mailto:admin@playfullearninglandscapes.fun">admin@playfullearninglandscapes.fun</a>.',
    'backToDream': '← Back to Dream',
  },
  { client: false },
);
