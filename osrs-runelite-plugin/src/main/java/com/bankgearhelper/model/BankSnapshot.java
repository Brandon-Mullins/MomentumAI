package com.bankgearhelper.model;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class BankSnapshot
{
	private final boolean available;
	private final Map<String, BankItem> itemsByNormalizedName;

	public BankSnapshot(boolean available, Map<String, BankItem> itemsByNormalizedName)
	{
		this.available = available;
		this.itemsByNormalizedName = Collections.unmodifiableMap(new HashMap<>(itemsByNormalizedName));
	}

	public static BankSnapshot unavailable()
	{
		return new BankSnapshot(false, Collections.emptyMap());
	}

	public boolean isAvailable()
	{
		return available;
	}

	public int getUniqueItemCount()
	{
		return itemsByNormalizedName.size();
	}

	public BankItem find(String itemName)
	{
		return itemsByNormalizedName.get(ItemNameNormalizer.normalize(itemName));
	}
}
