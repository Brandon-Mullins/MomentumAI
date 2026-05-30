package com.bankgearhelper.model;

public enum GearSlot
{
	HEAD("Head"),
	CAPE("Cape"),
	NECK("Neck"),
	AMMO("Ammo"),
	WEAPON("Weapon"),
	BODY("Body"),
	SHIELD("Shield"),
	LEGS("Legs"),
	HANDS("Hands"),
	FEET("Feet"),
	RING("Ring");

	private final String displayName;

	GearSlot(String displayName)
	{
		this.displayName = displayName;
	}

	public String getDisplayName()
	{
		return displayName;
	}
}
