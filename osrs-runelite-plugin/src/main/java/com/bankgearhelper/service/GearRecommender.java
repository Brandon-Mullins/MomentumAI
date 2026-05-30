package com.bankgearhelper.service;

import com.bankgearhelper.model.BankItem;
import com.bankgearhelper.model.BankSnapshot;
import com.bankgearhelper.model.GearRecommendation;
import com.bankgearhelper.model.GearSlot;
import com.bankgearhelper.model.MonsterPreset;
import com.bankgearhelper.model.RecommendedGear;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class GearRecommender
{
	public GearRecommendation recommend(MonsterPreset preset, BankSnapshot bank)
	{
		List<RecommendedGear> equippedGear = new ArrayList<>();
		List<String> missingOptionalUpgrades = new ArrayList<>();

		for (Map.Entry<GearSlot, List<String>> entry : preset.getGearPriority().entrySet())
		{
			BankItem ownedItem = null;
			List<String> betterUnownedItems = new ArrayList<>();

			for (String itemName : entry.getValue())
			{
				BankItem candidate = bank.find(itemName);
				if (candidate != null)
				{
					ownedItem = candidate;
					break;
				}

				betterUnownedItems.add(itemName);
			}

			equippedGear.add(new RecommendedGear(entry.getKey(), ownedItem, betterUnownedItems));
			missingOptionalUpgrades.addAll(betterUnownedItems);
		}

		return new GearRecommendation(
			preset,
			equippedGear,
			ownedInventoryItems(preset, bank),
			missingItems(preset.getRequiredItems(), bank),
			missingItems(preset.getOptionalUpgrades(), bank, missingOptionalUpgrades),
			bank.isAvailable(),
			bank.getUniqueItemCount()
		);
	}

	private List<BankItem> ownedInventoryItems(MonsterPreset preset, BankSnapshot bank)
	{
		List<BankItem> inventoryItems = new ArrayList<>();
		for (String itemName : preset.getInventorySuggestions())
		{
			BankItem item = bank.find(itemName);
			if (item != null)
			{
				inventoryItems.add(item);
			}
		}

		return inventoryItems;
	}

	private List<String> missingItems(List<String> itemNames, BankSnapshot bank)
	{
		return missingItems(itemNames, bank, itemNames);
	}

	private List<String> missingItems(List<String> itemNames, BankSnapshot bank, List<String> fallbackNames)
	{
		List<String> missingItems = new ArrayList<>();
		for (String itemName : itemNames)
		{
			if (bank.find(itemName) == null)
			{
				missingItems.add(itemName);
			}
		}

		if (missingItems.isEmpty() && itemNames.isEmpty())
		{
			missingItems.addAll(fallbackNames);
		}

		return missingItems;
	}
}
