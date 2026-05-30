package com.bankgearhelper.data;

import com.bankgearhelper.model.GearSlot;
import com.bankgearhelper.model.MonsterPreset;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public final class MonsterPresets
{
	private MonsterPresets()
	{
	}

	public static List<MonsterPreset> all()
	{
		List<MonsterPreset> presets = Arrays.asList(
			vorkath(),
			zulrah(),
			corporealBeast(),
			abyssalDemons(),
			gargoyles(),
			demonicGorillas(),
			generalGraardor(),
			commanderZilyana(),
			krilTsutsaroth(),
			kreearra()
		);

		return Collections.unmodifiableList(presets);
	}

	private static MonsterPreset vorkath()
	{
		return preset(
			"Vorkath",
			"Ranged",
			Arrays.asList(
				slot(GearSlot.HEAD, "Elite void ranger helm", "Void ranger helm", "Armadyl helmet", "Blessed coif", "Karil's coif"),
				slot(GearSlot.CAPE, "Ava's assembler", "Ava's accumulator", "Max cape"),
				slot(GearSlot.NECK, "Salve amulet(ei)", "Salve amulet(e)", "Necklace of anguish", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.AMMO, "Ruby dragon bolts (e)", "Ruby bolts (e)", "Diamond dragon bolts (e)", "Diamond bolts (e)"),
				slot(GearSlot.WEAPON, "Dragon hunter crossbow", "Dragon hunter wand", "Toxic blowpipe", "Rune crossbow"),
				slot(GearSlot.BODY, "Elite void top", "Void knight top", "Armadyl chestplate", "Karil's leathertop", "Blessed body"),
				slot(GearSlot.SHIELD, "Dragonfire ward", "Anti-dragon shield", "Dragonfire shield", "Odium ward"),
				slot(GearSlot.LEGS, "Elite void robe", "Void knight robe", "Armadyl chainskirt", "Karil's leatherskirt", "Blessed chaps"),
				slot(GearSlot.HANDS, "Void knight gloves", "Zaryte vambraces", "Barrows gloves", "Dragon gloves"),
				slot(GearSlot.FEET, "Pegasian boots", "Ranger boots", "Blessed boots", "Snakeskin boots"),
				slot(GearSlot.RING, "Archers ring (i)", "Archers ring", "Lightbearer", "Ring of suffering (i)", "Brimstone ring")
			),
			items("Extended super antifire", "Antifire potion", "Ranging potion", "Prayer potion", "Antivenom+", "Teleport to house", "Shark"),
			items("Anti-dragon shield", "Antifire potion"),
			items("Dragon hunter crossbow", "Ava's assembler", "Elite void ranger helm", "Salve amulet(ei)", "Dragonfire ward")
		);
	}

	private static MonsterPreset zulrah()
	{
		return preset(
			"Zulrah",
			"Magic/Ranged",
			Arrays.asList(
				slot(GearSlot.HEAD, "Ancestral hat", "Ahrim's hood", "Serpentine helm", "Void mage helm", "Mystic hat"),
				slot(GearSlot.CAPE, "Imbued saradomin cape", "Imbued zamorak cape", "Imbued guthix cape", "God cape", "Ava's assembler"),
				slot(GearSlot.NECK, "Occult necklace", "Necklace of anguish", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.AMMO, "Dragon arrows", "Amethyst arrows", "Rune arrows", "Adamant darts", "Rune darts"),
				slot(GearSlot.WEAPON, "Tumeken's shadow", "Sanguinesti staff", "Trident of the swamp", "Trident of the seas", "Bow of faerdhinen", "Toxic blowpipe"),
				slot(GearSlot.BODY, "Ancestral robe top", "Ahrim's robetop", "Karil's leathertop", "Void knight top", "Mystic robe top"),
				slot(GearSlot.SHIELD, "Elidinis' ward (f)", "Elidinis' ward", "Mage's book", "Book of darkness", "Tome of fire"),
				slot(GearSlot.LEGS, "Ancestral robe bottom", "Ahrim's robeskirt", "Karil's leatherskirt", "Void knight robe", "Mystic robe bottom"),
				slot(GearSlot.HANDS, "Tormented bracelet", "Barrows gloves", "Void knight gloves", "Mystic gloves"),
				slot(GearSlot.FEET, "Eternal boots", "Pegasian boots", "Infinity boots", "Mystic boots"),
				slot(GearSlot.RING, "Ring of suffering (i)", "Seers ring (i)", "Archers ring (i)", "Brimstone ring")
			),
			items("Antidote++", "Antivenom+", "Prayer potion", "Ranging potion", "Magic potion", "Zul-andra teleport", "Ring of dueling", "Shark"),
			items("Antipoison"),
			items("Tumeken's shadow", "Bow of faerdhinen", "Toxic blowpipe", "Ancestral robe top", "Tormented bracelet", "Occult necklace")
		);
	}

	private static MonsterPreset corporealBeast()
	{
		return preset(
			"Corporeal Beast",
			"Melee",
			Arrays.asList(
				slot(GearSlot.HEAD, "Torva full helm", "Neitiznot faceguard", "Helm of neitiznot", "Serpentine helm"),
				slot(GearSlot.CAPE, "Infernal cape", "Fire cape", "Mythical cape", "Ardougne cloak 4"),
				slot(GearSlot.NECK, "Amulet of torture", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.WEAPON, "Osmumten's fang", "Zamorakian spear", "Dragon spear"),
				slot(GearSlot.BODY, "Torva platebody", "Bandos chestplate", "Fighter torso", "Proselyte hauberk"),
				slot(GearSlot.SHIELD, "Avernic defender", "Dragon defender", "Dragonfire shield"),
				slot(GearSlot.LEGS, "Torva platelegs", "Bandos tassets", "Obsidian platelegs", "Proselyte cuisse"),
				slot(GearSlot.HANDS, "Ferocious gloves", "Barrows gloves", "Dragon gloves"),
				slot(GearSlot.FEET, "Primordial boots", "Dragon boots", "Rune boots"),
				slot(GearSlot.RING, "Berserker ring (i)", "Berserker ring", "Lightbearer", "Brimstone ring")
			),
			items("Super combat potion", "Prayer potion", "Stamina potion", "Games necklace", "Desert amulet 4", "Shark", "Karambwan"),
			items("Zamorakian spear", "Prayer potion"),
			items("Osmumten's fang", "Torva platebody", "Torva platelegs", "Ferocious gloves", "Primordial boots")
		);
	}

	private static MonsterPreset abyssalDemons()
	{
		return preset(
			"Abyssal Demons",
			"Melee",
			Arrays.asList(
				slot(GearSlot.HEAD, "Slayer helmet (i)", "Slayer helmet", "Neitiznot faceguard", "Helm of neitiznot"),
				slot(GearSlot.CAPE, "Infernal cape", "Fire cape", "Mythical cape", "Ardougne cloak 4"),
				slot(GearSlot.NECK, "Amulet of torture", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.WEAPON, "Scythe of vitur", "Ghrazi rapier", "Blade of saeldor", "Abyssal whip", "Dragon scimitar"),
				slot(GearSlot.BODY, "Torva platebody", "Bandos chestplate", "Fighter torso", "Proselyte hauberk"),
				slot(GearSlot.SHIELD, "Avernic defender", "Dragon defender", "Rune defender"),
				slot(GearSlot.LEGS, "Torva platelegs", "Bandos tassets", "Obsidian platelegs", "Proselyte cuisse"),
				slot(GearSlot.HANDS, "Ferocious gloves", "Barrows gloves", "Dragon gloves", "Combat bracelet"),
				slot(GearSlot.FEET, "Primordial boots", "Dragon boots", "Rune boots"),
				slot(GearSlot.RING, "Berserker ring (i)", "Berserker ring", "Lightbearer", "Brimstone ring")
			),
			items("Super combat potion", "Prayer potion", "Teleport to house", "Shark", "Holy wrench"),
			items("Abyssal whip"),
			items("Slayer helmet (i)", "Scythe of vitur", "Ghrazi rapier", "Torva platebody", "Ferocious gloves")
		);
	}

	private static MonsterPreset gargoyles()
	{
		return preset(
			"Gargoyles",
			"Melee",
			Arrays.asList(
				slot(GearSlot.HEAD, "Slayer helmet (i)", "Slayer helmet", "Neitiznot faceguard", "Helm of neitiznot"),
				slot(GearSlot.CAPE, "Infernal cape", "Fire cape", "Mythical cape", "Ardougne cloak 4"),
				slot(GearSlot.NECK, "Amulet of torture", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.WEAPON, "Ghrazi rapier", "Blade of saeldor", "Abyssal whip", "Dragon scimitar"),
				slot(GearSlot.BODY, "Torva platebody", "Bandos chestplate", "Fighter torso", "Proselyte hauberk"),
				slot(GearSlot.SHIELD, "Avernic defender", "Dragon defender", "Rune defender"),
				slot(GearSlot.LEGS, "Torva platelegs", "Bandos tassets", "Obsidian platelegs", "Proselyte cuisse"),
				slot(GearSlot.HANDS, "Ferocious gloves", "Barrows gloves", "Dragon gloves", "Combat bracelet"),
				slot(GearSlot.FEET, "Primordial boots", "Dragon boots", "Rune boots"),
				slot(GearSlot.RING, "Berserker ring (i)", "Berserker ring", "Lightbearer", "Ring of wealth")
			),
			items("Rock hammer", "Super combat potion", "Prayer potion", "High alchemy runes", "Shark"),
			items("Rock hammer", "Abyssal whip"),
			items("Slayer helmet (i)", "Ghrazi rapier", "Torva platebody", "Ferocious gloves", "Primordial boots")
		);
	}

	private static MonsterPreset demonicGorillas()
	{
		return preset(
			"Demonic Gorillas",
			"Melee/Ranged switch",
			Arrays.asList(
				slot(GearSlot.HEAD, "Slayer helmet (i)", "Slayer helmet", "Neitiznot faceguard", "Serpentine helm"),
				slot(GearSlot.CAPE, "Infernal cape", "Fire cape", "Ava's assembler", "Ava's accumulator"),
				slot(GearSlot.NECK, "Amulet of torture", "Necklace of anguish", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.AMMO, "Dragon arrows", "Amethyst arrows", "Rune arrows", "Rune bolts"),
				slot(GearSlot.WEAPON, "Arclight", "Emberlight", "Scorching bow", "Bow of faerdhinen", "Toxic blowpipe", "Abyssal whip"),
				slot(GearSlot.BODY, "Bandos chestplate", "Karil's leathertop", "Black d'hide body", "Fighter torso"),
				slot(GearSlot.SHIELD, "Dragon defender", "Avernic defender", "Book of law", "Odium ward"),
				slot(GearSlot.LEGS, "Bandos tassets", "Karil's leatherskirt", "Black d'hide chaps", "Obsidian platelegs"),
				slot(GearSlot.HANDS, "Ferocious gloves", "Barrows gloves", "Zaryte vambraces", "Black d'hide vambraces"),
				slot(GearSlot.FEET, "Primordial boots", "Pegasian boots", "Dragon boots", "Ranger boots"),
				slot(GearSlot.RING, "Berserker ring (i)", "Archers ring (i)", "Lightbearer", "Ring of suffering (i)")
			),
			items("Super combat potion", "Ranging potion", "Prayer potion", "Stamina potion", "Royal seed pod", "Shark", "Karambwan"),
			items("Arclight", "Toxic blowpipe", "Prayer potion"),
			items("Arclight", "Emberlight", "Scorching bow", "Bow of faerdhinen", "Zaryte vambraces", "Ferocious gloves")
		);
	}

	private static MonsterPreset generalGraardor()
	{
		return preset(
			"General Graardor",
			"Melee/Ranged",
			Arrays.asList(
				slot(GearSlot.HEAD, "Torva full helm", "Neitiznot faceguard", "Serpentine helm", "Armadyl helmet", "Blessed coif"),
				slot(GearSlot.CAPE, "Infernal cape", "Fire cape", "Ava's assembler", "Ava's accumulator"),
				slot(GearSlot.NECK, "Amulet of torture", "Necklace of anguish", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.AMMO, "Dragon arrows", "Amethyst arrows", "Rune arrows", "Ruby dragon bolts (e)"),
				slot(GearSlot.WEAPON, "Bow of faerdhinen", "Tumeken's shadow", "Osmumten's fang", "Ghrazi rapier", "Abyssal tentacle"),
				slot(GearSlot.BODY, "Crystal body", "Torva platebody", "Bandos chestplate", "Armadyl chestplate", "Karil's leathertop"),
				slot(GearSlot.SHIELD, "Avernic defender", "Dragon defender", "Elysian spirit shield", "Crystal shield"),
				slot(GearSlot.LEGS, "Crystal legs", "Torva platelegs", "Bandos tassets", "Armadyl chainskirt", "Karil's leatherskirt"),
				slot(GearSlot.HANDS, "Ferocious gloves", "Zaryte vambraces", "Barrows gloves", "Dragon gloves"),
				slot(GearSlot.FEET, "Primordial boots", "Pegasian boots", "Guardian boots", "Dragon boots"),
				slot(GearSlot.RING, "Berserker ring (i)", "Archers ring (i)", "Lightbearer", "Ring of suffering (i)")
			),
			items("Bandos godsword", "Super combat potion", "Ranging potion", "Prayer potion", "Stamina potion", "Bones to peaches", "Teleport to house"),
			items("Hammer", "Prayer potion"),
			items("Bow of faerdhinen", "Crystal body", "Crystal legs", "Osmumten's fang", "Torva platebody")
		);
	}

	private static MonsterPreset commanderZilyana()
	{
		return preset(
			"Commander Zilyana",
			"Ranged",
			Arrays.asList(
				slot(GearSlot.HEAD, "Masori mask (f)", "Masori mask", "Armadyl helmet", "Blessed coif", "Karil's coif"),
				slot(GearSlot.CAPE, "Ava's assembler", "Ava's accumulator", "Max cape"),
				slot(GearSlot.NECK, "Necklace of anguish", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.AMMO, "Dragon arrows", "Amethyst arrows", "Rune arrows", "Ruby dragon bolts (e)", "Diamond dragon bolts (e)"),
				slot(GearSlot.WEAPON, "Twisted bow", "Bow of faerdhinen", "Zaryte crossbow", "Dragon crossbow", "Rune crossbow"),
				slot(GearSlot.BODY, "Masori body (f)", "Masori body", "Crystal body", "Armadyl chestplate", "Karil's leathertop"),
				slot(GearSlot.SHIELD, "Twisted buckler", "Odium ward", "Book of law", "Crystal shield"),
				slot(GearSlot.LEGS, "Masori chaps (f)", "Masori chaps", "Crystal legs", "Armadyl chainskirt", "Karil's leatherskirt"),
				slot(GearSlot.HANDS, "Zaryte vambraces", "Barrows gloves", "Black d'hide vambraces"),
				slot(GearSlot.FEET, "Pegasian boots", "Ranger boots", "Blessed boots", "Snakeskin boots"),
				slot(GearSlot.RING, "Archers ring (i)", "Archers ring", "Lightbearer", "Ring of suffering (i)")
			),
			items("Stamina potion", "Ranging potion", "Prayer potion", "Saradomin brew", "Super restore", "Ecumenical key", "Teleport to house"),
			items("Stamina potion", "Ranging potion", "Prayer potion"),
			items("Twisted bow", "Masori body (f)", "Zaryte vambraces", "Pegasian boots", "Ava's assembler")
		);
	}

	private static MonsterPreset krilTsutsaroth()
	{
		return preset(
			"K'ril Tsutsaroth",
			"Melee/Ranged",
			Arrays.asList(
				slot(GearSlot.HEAD, "Torva full helm", "Neitiznot faceguard", "Serpentine helm", "Armadyl helmet", "Blessed coif"),
				slot(GearSlot.CAPE, "Infernal cape", "Fire cape", "Ava's assembler", "Ava's accumulator"),
				slot(GearSlot.NECK, "Amulet of torture", "Necklace of anguish", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.AMMO, "Dragon arrows", "Amethyst arrows", "Rune arrows", "Ruby dragon bolts (e)"),
				slot(GearSlot.WEAPON, "Bow of faerdhinen", "Tumeken's shadow", "Osmumten's fang", "Arclight", "Abyssal whip"),
				slot(GearSlot.BODY, "Crystal body", "Torva platebody", "Bandos chestplate", "Karil's leathertop", "Black d'hide body"),
				slot(GearSlot.SHIELD, "Avernic defender", "Dragon defender", "Elysian spirit shield", "Crystal shield"),
				slot(GearSlot.LEGS, "Crystal legs", "Torva platelegs", "Bandos tassets", "Karil's leatherskirt", "Black d'hide chaps"),
				slot(GearSlot.HANDS, "Ferocious gloves", "Zaryte vambraces", "Barrows gloves", "Dragon gloves"),
				slot(GearSlot.FEET, "Primordial boots", "Pegasian boots", "Guardian boots", "Dragon boots"),
				slot(GearSlot.RING, "Berserker ring (i)", "Archers ring (i)", "Lightbearer", "Ring of suffering (i)")
			),
			items("Super combat potion", "Ranging potion", "Prayer potion", "Saradomin brew", "Super restore", "Ecumenical key", "Teleport to house"),
			items("Arclight", "Prayer potion"),
			items("Bow of faerdhinen", "Crystal body", "Crystal legs", "Osmumten's fang", "Tumeken's shadow")
		);
	}

	private static MonsterPreset kreearra()
	{
		return preset(
			"Kree'arra",
			"Ranged",
			Arrays.asList(
				slot(GearSlot.HEAD, "Masori mask (f)", "Masori mask", "Armadyl helmet", "Blessed coif", "Karil's coif"),
				slot(GearSlot.CAPE, "Ava's assembler", "Ava's accumulator", "Max cape"),
				slot(GearSlot.NECK, "Necklace of anguish", "Amulet of fury", "Amulet of glory"),
				slot(GearSlot.AMMO, "Dragon arrows", "Amethyst arrows", "Rune arrows", "Diamond dragon bolts (e)", "Diamond bolts (e)"),
				slot(GearSlot.WEAPON, "Twisted bow", "Bow of faerdhinen", "Zaryte crossbow", "Dragon crossbow", "Rune crossbow"),
				slot(GearSlot.BODY, "Masori body (f)", "Masori body", "Crystal body", "Armadyl chestplate", "Karil's leathertop"),
				slot(GearSlot.SHIELD, "Twisted buckler", "Odium ward", "Book of law", "Crystal shield"),
				slot(GearSlot.LEGS, "Masori chaps (f)", "Masori chaps", "Crystal legs", "Armadyl chainskirt", "Karil's leatherskirt"),
				slot(GearSlot.HANDS, "Zaryte vambraces", "Barrows gloves", "Black d'hide vambraces"),
				slot(GearSlot.FEET, "Pegasian boots", "Ranger boots", "Blessed boots", "Snakeskin boots"),
				slot(GearSlot.RING, "Archers ring (i)", "Archers ring", "Lightbearer", "Ring of suffering (i)")
			),
			items("Ranging potion", "Prayer potion", "Saradomin brew", "Super restore", "Ecumenical key", "Teleport to house", "Bones to peaches"),
			items("Ranging potion", "Prayer potion"),
			items("Twisted bow", "Masori body (f)", "Masori chaps (f)", "Zaryte vambraces", "Pegasian boots")
		);
	}

	private static MonsterPreset preset(
		String monsterName,
		String combatStyle,
		List<SlotItems> slotItems,
		List<String> inventory,
		List<String> required,
		List<String> upgrades)
	{
		Map<GearSlot, List<String>> gear = new EnumMap<>(GearSlot.class);
		for (SlotItems slotItem : slotItems)
		{
			gear.put(slotItem.slot, slotItem.items);
		}

		return new MonsterPreset(monsterName, combatStyle, gear, inventory, required, upgrades);
	}

	private static SlotItems slot(GearSlot slot, String... items)
	{
		return new SlotItems(slot, Collections.unmodifiableList(new ArrayList<>(Arrays.asList(items))));
	}

	private static List<String> items(String... items)
	{
		return Collections.unmodifiableList(new ArrayList<>(Arrays.asList(items)));
	}

	private static class SlotItems
	{
		private final GearSlot slot;
		private final List<String> items;

		private SlotItems(GearSlot slot, List<String> items)
		{
			this.slot = slot;
			this.items = items;
		}
	}
}
