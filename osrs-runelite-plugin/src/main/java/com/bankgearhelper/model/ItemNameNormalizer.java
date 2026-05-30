package com.bankgearhelper.model;

import java.util.Locale;

public final class ItemNameNormalizer
{
	private ItemNameNormalizer()
	{
	}

	public static String normalize(String name)
	{
		if (name == null)
		{
			return "";
		}

		return name
			.replaceAll("<[^>]+>", "")
			.toLowerCase(Locale.ENGLISH)
			.replaceAll("[^a-z0-9]+", "");
	}
}
