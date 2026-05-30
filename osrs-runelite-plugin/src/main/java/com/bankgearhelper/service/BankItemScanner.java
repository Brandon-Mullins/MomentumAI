package com.bankgearhelper.service;

import com.bankgearhelper.model.BankItem;
import com.bankgearhelper.model.BankSnapshot;
import com.bankgearhelper.model.ItemNameNormalizer;
import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;
import net.runelite.api.Client;
import net.runelite.api.InventoryID;
import net.runelite.api.Item;
import net.runelite.api.ItemComposition;
import net.runelite.api.ItemContainer;
import net.runelite.client.game.ItemManager;

public class BankItemScanner
{
	private final Client client;
	private final ItemManager itemManager;

	@Inject
	public BankItemScanner(Client client, ItemManager itemManager)
	{
		this.client = client;
		this.itemManager = itemManager;
	}

	@SuppressWarnings("deprecation")
	public BankSnapshot scan()
	{
		ItemContainer bank = client.getItemContainer(InventoryID.BANK);
		if (bank == null)
		{
			return BankSnapshot.unavailable();
		}

		return fromContainer(bank);
	}

	public BankSnapshot fromContainer(ItemContainer bank)
	{
		Map<String, BankItem> items = new HashMap<>();
		for (Item item : bank.getItems())
		{
			if (item.getId() <= 0 || item.getQuantity() <= 0)
			{
				continue;
			}

			int canonicalId = itemManager.canonicalize(item.getId());
			ItemComposition composition = itemManager.getItemComposition(canonicalId);
			String name = composition.getName();
			String normalizedName = ItemNameNormalizer.normalize(name);
			if (normalizedName.isEmpty() || "null".equalsIgnoreCase(name))
			{
				continue;
			}

			BankItem existing = items.get(normalizedName);
			if (existing == null)
			{
				items.put(normalizedName, new BankItem(canonicalId, name, item.getQuantity()));
			}
			else
			{
				items.put(normalizedName, new BankItem(existing.getItemId(), existing.getName(), existing.getQuantity() + item.getQuantity()));
			}
		}

		return new BankSnapshot(true, items);
	}
}
