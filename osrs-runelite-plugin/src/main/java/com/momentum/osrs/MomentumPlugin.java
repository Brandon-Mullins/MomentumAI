package com.momentum.osrs;

import com.google.inject.Provides;
import javax.inject.Inject;
import net.runelite.api.ChatMessageType;
import net.runelite.api.Client;
import net.runelite.api.GameState;
import net.runelite.api.events.GameStateChanged;
import net.runelite.client.config.ConfigManager;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;

@PluginDescriptor(
	name = "Momentum Helper",
	description = "A starter OSRS helper plugin for building consistent in-game momentum.",
	tags = {"goals", "helper", "momentum"}
)
public class MomentumPlugin extends Plugin
{
	@Inject
	private Client client;

	@Inject
	private MomentumConfig config;

	@Subscribe
	public void onGameStateChanged(GameStateChanged event)
	{
		if (event.getGameState() == GameState.LOGGED_IN && config.showLoginMessage())
		{
			client.addChatMessage(ChatMessageType.GAMEMESSAGE, "", config.loginMessage(), null);
		}
	}

	@Provides
	MomentumConfig provideConfig(ConfigManager configManager)
	{
		return configManager.getConfig(MomentumConfig.class);
	}
}
