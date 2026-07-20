const API_BASE = "https://savvyrent-hud-api.abobroy.workers.dev";

const form = document.getElementById("rent-form");
const submitButton = document.getElementById("submit-button");
const formError = document.getElementById("form-error");
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const reportElement = document.getElementById("report");

document.getElementById("year").textContent = new Date().getFullYear();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearError();
  showLoading(true);

  try {
    const payload = formPayload(new FormData(form));

    const response = await fetch(`${API_BASE}/api/rent-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `The API returned an invalid response with HTTP status ${response.status}.`
      );
    }

    if (!response.ok) {
      throw new Error(buildApiErrorMessage(data, response.status));
    }

    renderReport(data);
  } catch (error) {
    showLoading(false);
    emptyState.classList.remove("hidden");

    const message =
      error.message === "Failed to fetch" ||
      error.message.includes("NetworkError") ||
      error.message.includes("Network request failed")
        ? "The website could not reach the Rental Intelligence API. Confirm that the Cloudflare Worker is deployed and that savvyrent.com is included in the Worker's CORS allow-list."
        : error.message;

    showError(message);
  }
});

function formPayload(formData) {
  return compactObject({
    address: text(formData.get("address")),
    unitType: text(formData.get("unitType")),
    bedrooms: number(formData.get("bedrooms")),
    bathrooms: number(formData.get("bathrooms")),
    squareFeet: number(formData.get("squareFeet")),
    propertyType: text(formData.get("propertyType")),
    condition: text(formData.get("condition")),
    parking: text(formData.get("parking")),
    laundry: text(formData.get("laundry")),
    furnishing: text(formData.get("furnishing")),
    leaseStartDate: text(formData.get("leaseStartDate")),
    purchasePrice: number(formData.get("purchasePrice")),
    monthlyOperatingCosts: number(
      formData.get("monthlyOperatingCosts")
    ),
  });
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) =>
        item !== undefined &&
        item !== null &&
        item !== ""
    )
  );
}

function text(value) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function number(value) {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function buildApiErrorMessage(data, status) {
  const parts = [];

  if (data?.error) {
    parts.push(data.error);
  } else {
    parts.push(`API request failed with HTTP status ${status}`);
  }

  if (
    Array.isArray(data?.validation) &&
    data.validation.length
  ) {
    parts.push(data.validation.join("; "));
  }

  if (data?.details) {
    const details = formatErrorDetails(data.details);

    if (details) {
      parts.push(details);
    }
  }

  return parts.join(" — ");
}

function formatErrorDetails(details) {
  if (!details) {
    return "";
  }

  if (typeof details === "string") {
    return details;
  }

  if (Array.isArray(details)) {
    return details
      .map((item) => formatErrorDetails(item))
      .filter(Boolean)
      .join(" | ");
  }

  if (typeof details === "object") {
    const parts = [];

    if (details.census) {
      parts.push(
        `Census: ${formatErrorDetails(details.census)}`
      );
    }

    if (details.hud) {
      parts.push(
        `HUD: ${formatErrorDetails(details.hud)}`
      );
    }

    for (const [key, value] of Object.entries(details)) {
      if (
        key === "census" ||
        key === "hud"
      ) {
        continue;
      }

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        continue;
      }

      const label = labelize(key);
      const formattedValue = formatErrorDetails(value);

      if (formattedValue) {
        parts.push(`${label}: ${formattedValue}`);
      }
    }

    return parts.join(" | ");
  }

  return String(details);
}

function showLoading(isLoading) {
  submitButton.disabled = isLoading;

  const buttonLabel =
    submitButton.querySelector("span");

  if (buttonLabel) {
    buttonLabel.textContent = isLoading
      ? "Generating report…"
      : "Generate rental report";
  }

  emptyState.classList.add("hidden");
  reportElement.classList.add("hidden");
  loadingState.classList.toggle(
    "hidden",
    !isLoading
  );
}

function renderReport(data) {
  showLoading(false);
  reportElement.classList.remove("hidden");

  const valuation = data.valuation || {};
  const neighborhood = data.neighborhood || {};
  const tract = neighborhood.censusTract || {};
  const hud = data.hud || {};
  const investment = data.investment || {};

  setText(
    "matched-address",
    data.location?.matchedAddress ||
      data.input?.address ||
      "Matched property"
  );

  setText(
    "quality-badge",
    `${data.dataQuality?.overall || "unknown"} data quality`
  );

  setText(
    "estimated-rent",
    money(valuation.estimatedMonthlyRent)
  );

  setText(
    "rent-range",
    `${money(
      valuation.likelyRentRange?.low
    )} – ${money(
      valuation.likelyRentRange?.high
    )} likely range`
  );

  setText(
    "confidence",
    Number.isFinite(
      Number(valuation.confidenceScore)
    )
      ? `${valuation.confidenceScore}%`
      : "—"
  );

  setText(
    "rent-per-sqft",
    Number.isFinite(
      Number(valuation.rentPerSquareFoot)
    )
      ? `$${Number(
          valuation.rentPerSquareFoot
        ).toFixed(2)}`
      : "—"
  );

  setText(
    "hud-fmr",
    money(hud.fairMarketRent)
  );

  setText(
    "acs-rent",
    money(tract.medianGrossRent)
  );

  setText(
    "trend-12",
    percent(
      neighborhood.trends?.rent12MonthPercent
    )
  );

  setText(
    "trend-36",
    percent(
      neighborhood.trends?.rent36MonthPercent
    )
  );

  setText(
    "vacancy",
    percent(
      tract.housing?.overallVacancyRate
    )
  );

  setText(
    "availability",
    percent(
      tract.housing?.rentalAvailabilityRate
    )
  );

  setText(
    "comparables-note",
    data.comparables?.explanation ||
      "Live rental listings are not included in this public-data release."
  );

  renderAdjustments(
    valuation.adjustments || []
  );

  renderInvestment(investment);

  document.getElementById(
    "raw-json"
  ).textContent = JSON.stringify(
    data,
    null,
    2
  );

  reportElement.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function renderAdjustments(adjustments) {
  const container =
    document.getElementById("adjustments");

  container.innerHTML = "";

  if (!adjustments.length) {
    container.textContent =
      "No material property adjustments were applied.";
    return;
  }

  for (const adjustment of adjustments) {
    const pill = document.createElement("span");

    pill.className =
      `adjustment-pill ${
        adjustment.percent >= 0
          ? "positive"
          : "negative"
      }`;

    pill.textContent =
      `${labelize(adjustment.factor)} ` +
      `${adjustment.percent > 0 ? "+" : ""}` +
      `${adjustment.percent}%`;

    container.appendChild(pill);
  }
}

function renderInvestment(investment) {
  const section = document.getElementById(
    "investment-section"
  );

  const hasPurchaseMetrics =
    investment.grossRentMultiplier !== null &&
    investment.grossRentMultiplier !== undefined;

  section.classList.toggle(
    "hidden",
    !hasPurchaseMetrics
  );

  if (!hasPurchaseMetrics) {
    return;
  }

  setText(
    "annual-gross",
    money(investment.annualGrossRent)
  );

  setText(
    "noi",
    money(
      investment.annualNetOperatingIncome
    )
  );

  setText(
    "grm",
    Number.isFinite(
      Number(investment.grossRentMultiplier)
    )
      ? Number(
          investment.grossRentMultiplier
        ).toFixed(2)
      : "—"
  );

  setText(
    "cap-rate",
    Number.isFinite(
      Number(
        investment.capitalizationRatePercent
      )
    )
      ? `${Number(
          investment.capitalizationRatePercent
        ).toFixed(2)}%`
      : "—"
  );
}

function labelize(value) {
  return String(value)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^./,
      (character) => character.toUpperCase()
    );
}

function money(value) {
  return Number.isFinite(Number(value))
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(Number(value))
    : "—";
}

function percent(value) {
  return Number.isFinite(Number(value))
    ? `${Number(value) > 0 ? "+" : ""}` +
        `${Number(value).toFixed(1)}%`
    : "—";
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? "—";
  }
}

function showError(message) {
  formError.textContent = message;
  formError.classList.remove("hidden");

  formError.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

function clearError() {
  formError.textContent = "";
  formError.classList.add("hidden");
}
