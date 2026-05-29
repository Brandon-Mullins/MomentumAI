import type { QuestWalkthrough } from '@/types/quest'

export const starterQuestWalkthroughs: QuestWalkthrough[] = [
  {
    title: "Cook's Assistant",
    description:
      "Help the Lumbridge cook gather milk, an egg, and flour for Duke Horacio's birthday cake.",
    wikiUrl: 'https://runescape.wiki/w/Cook%27s_Assistant',
    requirements: ['No skill requirements'],
    recommended: ['Bucket', 'Empty pot'],
    steps: [
      {
        id: 'start',
        title: 'Talk to the Cook',
        body: 'Talk to the cook in Lumbridge Castle kitchen on the ground floor. He needs a bucket of milk, an egg, and a pot of flour.',
        wikiAnchor: 'A_feast_for_a_Duke'
      },
      {
        id: 'milk',
        title: 'Bucket of milk',
        body: 'Go to the cow field north-east of Lumbridge goblins and use a bucket on a dairy cow.',
        wikiAnchor: 'Bucket_of_milk'
      },
      {
        id: 'egg',
        title: 'Egg',
        body: 'Pick up an egg from the chicken coop at Lumbridge Watermill or near Fred the Farmer.',
        wikiAnchor: 'Egg'
      },
      {
        id: 'flour',
        title: 'Pot of flour',
        body: 'Pick wheat west of Fred the Farmer, grind it at Mill Lane Mill, then fill a pot with flour on the ground floor.',
        wikiAnchor: 'Pot_of_flour'
      },
      {
        id: 'finish',
        title: 'Delivery',
        body: 'Return to the Lumbridge Castle cook with all three ingredients to finish the quest.',
        wikiAnchor: 'Delivery'
      }
    ]
  },
  {
    title: 'The Blood Pact',
    description: 'Stop a dark wizard ritual beneath Lumbridge and rescue the townsfolk.',
    wikiUrl: 'https://runescape.wiki/w/The_Blood_Pact',
    requirements: ['Combat level recommended for three low-level bosses'],
    recommended: ['Food', 'Melee or ranged gear'],
    steps: [
      {
        id: 'start',
        title: 'Enter the crypt',
        body: 'Talk to Xenia in Lumbridge and enter the catacombs beneath the church to begin the quest.'
      },
      {
        id: 'kazan',
        title: 'Defeat Kazam',
        body: 'Progress through the dungeon and defeat Kazam, the first cultist.'
      },
      {
        id: 'renegade',
        title: 'Defeat the Renegade Knight',
        body: 'Continue deeper and defeat the Renegade Knight.'
      },
      {
        id: 'cultists',
        title: 'Defeat Caitlin and Reese',
        body: 'Finish the ritual chamber fight against Caitlin and Reese to complete the quest.'
      }
    ]
  }
]

export function getStarterWalkthrough(title: string): QuestWalkthrough | undefined {
  return starterQuestWalkthroughs.find(
    (walkthrough) => walkthrough.title.toLowerCase() === title.toLowerCase()
  )
}

export const featuredQuestTitles = starterQuestWalkthroughs.map((quest) => quest.title)
