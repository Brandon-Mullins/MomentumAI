package com.momentum.osrs;

import net.runelite.client.config.Config;
import net.runelite.client.config.ConfigGroup;
import net.runelite.client.config.ConfigItem;

@ConfigGroup("momentumhelper")
public interface MomentumConfig extends Config
{
	@ConfigItem(
		keyName = "showLoginMessage",
		name = "Show login message",
		description = "Send a chat reminder when you log in."
	)
	default boolean showLoginMessage()
	{
		return true;
	}

	@ConfigItem(
		keyName = "loginMessage",
		name = "Login message",
		description = "The message Momentum Helper sends after login."
	)
	default String loginMessage()
	{
		return "Momentum Helper is ready.";
	}
}
