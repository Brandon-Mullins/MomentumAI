package com.momentum.osrs;

import net.runelite.client.RuneLite;
import net.runelite.client.externalplugins.ExternalPluginManager;

public class MomentumPluginTest
{
	public static void main(String[] args) throws Exception
	{
		ExternalPluginManager.loadBuiltin(MomentumPlugin.class);
		RuneLite.main(args);
	}
}
