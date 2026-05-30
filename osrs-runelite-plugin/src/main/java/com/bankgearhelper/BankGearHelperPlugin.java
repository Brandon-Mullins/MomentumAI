package com.bankgearhelper;

import com.bankgearhelper.data.MonsterPresets;
import com.bankgearhelper.model.BankSnapshot;
import com.bankgearhelper.model.GearRecommendation;
import com.bankgearhelper.model.MonsterPreset;
import com.bankgearhelper.service.BankItemScanner;
import com.bankgearhelper.service.GearRecommender;
import com.bankgearhelper.ui.BankGearHelperPanel;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.util.List;
import javax.inject.Inject;
import net.runelite.api.InventoryID;
import net.runelite.api.events.ItemContainerChanged;
import net.runelite.client.callback.ClientThread;
import net.runelite.client.eventbus.Subscribe;
import net.runelite.client.plugins.Plugin;
import net.runelite.client.plugins.PluginDescriptor;
import net.runelite.client.ui.ClientToolbar;
import net.runelite.client.ui.NavigationButton;

@PluginDescriptor(
	name = "Bank Gear Helper",
	description = "Recommends monster gear setups from items already found in your bank.",
	tags = {"bank", "gear", "pvm", "boss", "helper"}
)
public class BankGearHelperPlugin extends Plugin
{
	private final GearRecommender gearRecommender = new GearRecommender();

	@Inject
	private ClientToolbar clientToolbar;

	@Inject
	private ClientThread clientThread;

	@Inject
	private BankItemScanner bankItemScanner;

	private BankGearHelperPanel panel;
	private NavigationButton navigationButton;
	private List<MonsterPreset> presets;
	private MonsterPreset selectedPreset;
	private BankSnapshot bankSnapshot = BankSnapshot.unavailable();

	@Override
	protected void startUp()
	{
		presets = MonsterPresets.all();
		selectedPreset = presets.get(0);
		panel = new BankGearHelperPanel(presets, this::selectPreset, this::refreshBankScan);
		navigationButton = NavigationButton.builder()
			.tooltip("Bank Gear Helper")
			.icon(createNavigationIcon())
			.priority(5)
			.panel(panel)
			.build();

		clientToolbar.addNavigation(navigationButton);
		refreshBankScan();
	}

	@Override
	protected void shutDown()
	{
		if (navigationButton != null)
		{
			clientToolbar.removeNavigation(navigationButton);
		}

		panel = null;
		navigationButton = null;
		selectedPreset = null;
		bankSnapshot = BankSnapshot.unavailable();
	}

	@SuppressWarnings("deprecation")
	@Subscribe
	public void onItemContainerChanged(ItemContainerChanged event)
	{
		if (event.getContainerId() != InventoryID.BANK.getId())
		{
			return;
		}

		bankSnapshot = bankItemScanner.fromContainer(event.getItemContainer());
		updateRecommendation();
	}

	private void selectPreset(MonsterPreset preset)
	{
		selectedPreset = preset;
		refreshBankScan();
	}

	private void refreshBankScan()
	{
		clientThread.invokeLater(() ->
		{
			bankSnapshot = bankItemScanner.scan();
			updateRecommendation();
		});
	}

	private void updateRecommendation()
	{
		if (panel == null || selectedPreset == null)
		{
			return;
		}

		GearRecommendation recommendation = gearRecommender.recommend(selectedPreset, bankSnapshot);
		panel.showRecommendation(recommendation);
	}

	private BufferedImage createNavigationIcon()
	{
		BufferedImage icon = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
		Graphics2D graphics = icon.createGraphics();
		graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
		graphics.setColor(new Color(35, 35, 35));
		graphics.fillRoundRect(1, 1, 14, 14, 4, 4);
		graphics.setColor(new Color(220, 138, 0));
		graphics.setStroke(new BasicStroke(2f));
		graphics.drawRoundRect(2, 2, 12, 12, 4, 4);
		graphics.drawLine(5, 6, 11, 6);
		graphics.drawLine(5, 10, 11, 10);
		graphics.dispose();
		return icon;
	}
}
