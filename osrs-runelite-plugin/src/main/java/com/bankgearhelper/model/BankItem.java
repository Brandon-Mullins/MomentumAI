package com.bankgearhelper.model;

public class BankItem
{
	private final int itemId;
	private final String name;
	private final int quantity;

	public BankItem(int itemId, String name, int quantity)
	{
		this.itemId = itemId;
		this.name = name;
		this.quantity = quantity;
	}

	public int getItemId()
	{
		return itemId;
	}

	public String getName()
	{
		return name;
	}

	public int getQuantity()
	{
		return quantity;
	}
}
