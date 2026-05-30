package com.bankgearhelper.model;

import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public class MonsterPreset
{
	private final String monsterName;
	private final String combatStyle;
	private final Map<GearSlot, List<String>> gearPriority;
	private final List<String> inventorySuggestions;
	private final List<String> requiredItems;
	private final List<String> optionalUpgrades;

	public MonsterPreset(
		String monsterName,
		String combatStyle,
		Map<GearSlot, List<String>> gearPriority,
		List<String> inventorySuggestions,
		List<String> requiredItems,
		List<String> optionalUpgrades)
	{
		this.monsterName = monsterName;
		this.combatStyle = combatStyle;
		this.gearPriority = Collections.unmodifiableMap(new EnumMap<>(gearPriority));
		this.inventorySuggestions = Collections.unmodifiableList(inventorySuggestions);
		this.requiredItems = Collections.unmodifiableList(requiredItems);
		this.optionalUpgrades = Collections.unmodifiableList(optionalUpgrades);
	}

	public String getMonsterName()
	{
		return monsterName;
	}

	public String getCombatStyle()
	{
		return combatStyle;
	}

	public Map<GearSlot, List<String>> getGearPriority()
	{
		return gearPriority;
	}

	public List<String> getInventorySuggestions()
	{
		return inventorySuggestions;
	}

	public List<String> getRequiredItems()
	{
		return requiredItems;
	}

	public List<String> getOptionalUpgrades()
	{
		return optionalUpgrades;
	}

	@Override
	public String toString()
	{
		return monsterName;
	}
}
