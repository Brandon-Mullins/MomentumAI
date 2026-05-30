package com.bankgearhelper.model;

import java.util.Collections;
import java.util.List;

public class GearRecommendation
{
	private final MonsterPreset preset;
	private final List<RecommendedGear> equippedGear;
	private final List<BankItem> inventoryItems;
	private final List<String> missingRequiredItems;
	private final List<String> missingOptionalUpgrades;
	private final boolean bankAvailable;
	private final int uniqueBankItemCount;

	public GearRecommendation(
		MonsterPreset preset,
		List<RecommendedGear> equippedGear,
		List<BankItem> inventoryItems,
		List<String> missingRequiredItems,
		List<String> missingOptionalUpgrades,
		boolean bankAvailable,
		int uniqueBankItemCount)
	{
		this.preset = preset;
		this.equippedGear = Collections.unmodifiableList(equippedGear);
		this.inventoryItems = Collections.unmodifiableList(inventoryItems);
		this.missingRequiredItems = Collections.unmodifiableList(missingRequiredItems);
		this.missingOptionalUpgrades = Collections.unmodifiableList(missingOptionalUpgrades);
		this.bankAvailable = bankAvailable;
		this.uniqueBankItemCount = uniqueBankItemCount;
	}

	public MonsterPreset getPreset()
	{
		return preset;
	}

	public List<RecommendedGear> getEquippedGear()
	{
		return equippedGear;
	}

	public List<BankItem> getInventoryItems()
	{
		return inventoryItems;
	}

	public List<String> getMissingRequiredItems()
	{
		return missingRequiredItems;
	}

	public List<String> getMissingOptionalUpgrades()
	{
		return missingOptionalUpgrades;
	}

	public boolean isBankAvailable()
	{
		return bankAvailable;
	}

	public int getUniqueBankItemCount()
	{
		return uniqueBankItemCount;
	}
}
