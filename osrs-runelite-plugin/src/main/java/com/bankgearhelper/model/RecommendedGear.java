package com.bankgearhelper.model;

import java.util.List;

public class RecommendedGear
{
	private final GearSlot slot;
	private final BankItem ownedItem;
	private final List<String> missingBetterItems;

	public RecommendedGear(GearSlot slot, BankItem ownedItem, List<String> missingBetterItems)
	{
		this.slot = slot;
		this.ownedItem = ownedItem;
		this.missingBetterItems = missingBetterItems;
	}

	public GearSlot getSlot()
	{
		return slot;
	}

	public BankItem getOwnedItem()
	{
		return ownedItem;
	}

	public List<String> getMissingBetterItems()
	{
		return missingBetterItems;
	}
}
