package com.bankgearhelper.ui;

import com.bankgearhelper.model.BankItem;
import com.bankgearhelper.model.GearRecommendation;
import com.bankgearhelper.model.ItemNameNormalizer;
import com.bankgearhelper.model.MonsterPreset;
import com.bankgearhelper.model.RecommendedGear;
import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;
import javax.swing.BorderFactory;
import javax.swing.DefaultComboBoxModel;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
import net.runelite.client.ui.ColorScheme;
import net.runelite.client.ui.PluginPanel;

public class BankGearHelperPanel extends PluginPanel
{
	private final List<MonsterPreset> presets;
	private final Consumer<MonsterPreset> onPresetSelected;
	private final Runnable onRefreshRequested;
	private final JComboBox<MonsterPreset> monsterSelect;
	private final JLabel bankStatus = new JLabel("Open your bank once to load item data.");
	private final JPanel resultPanel = new JPanel();

	public BankGearHelperPanel(List<MonsterPreset> presets, Consumer<MonsterPreset> onPresetSelected, Runnable onRefreshRequested)
	{
		super();
		this.presets = presets;
		this.onPresetSelected = onPresetSelected;
		this.onRefreshRequested = onRefreshRequested;
		this.monsterSelect = new JComboBox<>(new DefaultComboBoxModel<>(presets.toArray(new MonsterPreset[0])));

		setLayout(new BorderLayout(0, 8));
		setBackground(ColorScheme.DARK_GRAY_COLOR);
		add(buildControls(), BorderLayout.NORTH);

		resultPanel.setLayout(new javax.swing.BoxLayout(resultPanel, javax.swing.BoxLayout.Y_AXIS));
		resultPanel.setBackground(ColorScheme.DARK_GRAY_COLOR);
		add(resultPanel, BorderLayout.CENTER);

		monsterSelect.addActionListener(event -> selectCurrentMonster());
	}

	public void showRecommendation(GearRecommendation recommendation)
	{
		SwingUtilities.invokeLater(() -> renderRecommendation(recommendation));
	}

	private JPanel buildControls()
	{
		JPanel controls = new JPanel();
		controls.setLayout(new javax.swing.BoxLayout(controls, javax.swing.BoxLayout.Y_AXIS));
		controls.setBackground(ColorScheme.DARK_GRAY_COLOR);

		JLabel title = new JLabel("Bank Gear Helper");
		title.setForeground(ColorScheme.BRAND_ORANGE);
		title.setAlignmentX(Component.LEFT_ALIGNMENT);
		controls.add(title);

		JLabel searchLabel = new JLabel("Search/select monster");
		searchLabel.setForeground(ColorScheme.TEXT_COLOR);
		searchLabel.setBorder(BorderFactory.createEmptyBorder(8, 0, 2, 0));
		searchLabel.setAlignmentX(Component.LEFT_ALIGNMENT);
		controls.add(searchLabel);

		monsterSelect.setEditable(true);
		monsterSelect.setMaximumSize(new Dimension(Integer.MAX_VALUE, 28));
		monsterSelect.setAlignmentX(Component.LEFT_ALIGNMENT);
		controls.add(monsterSelect);

		JButton refreshButton = new JButton("Refresh bank scan");
		refreshButton.setFocusable(false);
		refreshButton.setAlignmentX(Component.LEFT_ALIGNMENT);
		refreshButton.setMaximumSize(new Dimension(Integer.MAX_VALUE, 28));
		refreshButton.addActionListener(event -> onRefreshRequested.run());
		controls.add(refreshButton);

		bankStatus.setForeground(ColorScheme.LIGHT_GRAY_COLOR);
		bankStatus.setBorder(BorderFactory.createEmptyBorder(8, 0, 0, 0));
		bankStatus.setAlignmentX(Component.LEFT_ALIGNMENT);
		controls.add(bankStatus);

		return controls;
	}

	private void selectCurrentMonster()
	{
		MonsterPreset selectedPreset = findSelectedPreset();
		if (selectedPreset != null)
		{
			onPresetSelected.accept(selectedPreset);
		}
	}

	private MonsterPreset findSelectedPreset()
	{
		Object selectedItem = monsterSelect.getSelectedItem();
		if (selectedItem instanceof MonsterPreset)
		{
			return (MonsterPreset) selectedItem;
		}

		String searchText = selectedItem == null ? "" : selectedItem.toString();
		String normalizedSearch = ItemNameNormalizer.normalize(searchText);
		if (normalizedSearch.isEmpty())
		{
			return null;
		}

		for (MonsterPreset preset : presets)
		{
			String normalizedMonster = ItemNameNormalizer.normalize(preset.getMonsterName());
			if (normalizedMonster.equals(normalizedSearch) || normalizedMonster.contains(normalizedSearch))
			{
				return preset;
			}
		}

		return null;
	}

	private void renderRecommendation(GearRecommendation recommendation)
	{
		resultPanel.removeAll();

		if (recommendation.isBankAvailable())
		{
			bankStatus.setText("Bank scan: " + recommendation.getUniqueBankItemCount() + " unique owned items.");
		}
		else
		{
			bankStatus.setText("Bank scan unavailable. Open your bank, then refresh.");
		}

		MonsterPreset preset = recommendation.getPreset();
		resultPanel.add(sectionTitle(preset.getMonsterName()));
		resultPanel.add(line("Style: " + preset.getCombatStyle(), ColorScheme.TEXT_COLOR));

		resultPanel.add(sectionTitle("Recommended gear"));
		for (RecommendedGear gear : recommendation.getEquippedGear())
		{
			BankItem ownedItem = gear.getOwnedItem();
			String value = ownedItem == null ? "No owned item found" : ownedItem.getName();
			resultPanel.add(line(gear.getSlot().getDisplayName() + ": " + value, ownedItem == null ? ColorScheme.PROGRESS_ERROR_COLOR : ColorScheme.TEXT_COLOR));
			if (!gear.getMissingBetterItems().isEmpty())
			{
				String missingLabel = ownedItem == null ? "Priority missing: " : "Better missing: ";
				resultPanel.add(subLine(missingLabel + joinLimited(gear.getMissingBetterItems(), 3)));
			}
		}

		resultPanel.add(sectionTitle("Recommended inventory"));
		if (recommendation.getInventoryItems().isEmpty())
		{
			resultPanel.add(line("No suggested inventory items found in bank.", ColorScheme.LIGHT_GRAY_COLOR));
		}
		else
		{
			for (BankItem item : recommendation.getInventoryItems())
			{
				resultPanel.add(line(item.getName() + quantitySuffix(item), ColorScheme.TEXT_COLOR));
			}
		}

		resultPanel.add(sectionTitle("Missing required"));
		addStringList(recommendation.getMissingRequiredItems(), "All required items found.");

		resultPanel.add(sectionTitle("Unowned upgrades"));
		addStringList(unique(recommendation.getMissingOptionalUpgrades()), "No listed optional upgrades missing.");

		resultPanel.revalidate();
		resultPanel.repaint();
	}

	private JLabel sectionTitle(String text)
	{
		JLabel label = new JLabel(text);
		label.setForeground(ColorScheme.BRAND_ORANGE);
		label.setBorder(BorderFactory.createEmptyBorder(10, 0, 2, 0));
		label.setAlignmentX(Component.LEFT_ALIGNMENT);
		return label;
	}

	private JLabel line(String text, java.awt.Color color)
	{
		JLabel label = new JLabel("<html>" + escape(text) + "</html>");
		label.setForeground(color);
		label.setAlignmentX(Component.LEFT_ALIGNMENT);
		return label;
	}

	private JLabel subLine(String text)
	{
		JLabel label = line(text, ColorScheme.LIGHT_GRAY_COLOR);
		label.setBorder(BorderFactory.createEmptyBorder(0, 8, 2, 0));
		return label;
	}

	private void addStringList(List<String> values, String emptyText)
	{
		if (values.isEmpty())
		{
			resultPanel.add(line(emptyText, ColorScheme.LIGHT_GRAY_COLOR));
			return;
		}

		for (String value : values)
		{
			resultPanel.add(line(value, ColorScheme.TEXT_COLOR));
		}
	}

	private List<String> unique(List<String> values)
	{
		Set<String> seen = new HashSet<>();
		java.util.ArrayList<String> uniqueValues = new java.util.ArrayList<>();
		for (String value : values)
		{
			if (seen.add(ItemNameNormalizer.normalize(value)))
			{
				uniqueValues.add(value);
			}
		}

		return uniqueValues;
	}

	private String joinLimited(List<String> values, int max)
	{
		StringBuilder builder = new StringBuilder();
		for (int i = 0; i < values.size() && i < max; i++)
		{
			if (i > 0)
			{
				builder.append(", ");
			}
			builder.append(values.get(i));
		}

		if (values.size() > max)
		{
			builder.append("...");
		}

		return builder.toString();
	}

	private String quantitySuffix(BankItem item)
	{
		return item.getQuantity() > 1 ? " x" + item.getQuantity() : "";
	}

	private String escape(String text)
	{
		return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
	}
}
