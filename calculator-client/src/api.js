const API_BASE =
  import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000";

async function readJson(response, requestName) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(`${requestName} returned an invalid response`);
  }

  if (!response.ok) {
    throw new Error(data?.detail ?? data?.error ?? `${requestName} failed`);
  }

  return data;
}

export async function fetchHistory(fetchImpl = fetch) {
  const response = await fetchImpl(`${API_BASE}/history?limit=50`);
  const data = await readJson(response, "Loading history");

  if (!Array.isArray(data)) {
    throw new Error("Loading history returned an invalid response");
  }

  return data;
}

export async function calculateExpression(expression, fetchImpl = fetch) {
  const response = await fetchImpl(`${API_BASE}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expr: expression }),
  });
  const data = await readJson(response, "Calculation");

  if (!data?.ok) {
    throw new Error(data?.error || "Calculation failed");
  }

  return data;
}

export async function calculateAndFetchHistory(expression, fetchImpl = fetch) {
  const calculation = await calculateExpression(expression, fetchImpl);

  try {
    const history = await fetchHistory(fetchImpl);
    return { calculation, history, historyError: null };
  } catch (historyError) {
    return { calculation, history: null, historyError };
  }
}

export async function clearHistory(fetchImpl = fetch) {
  const response = await fetchImpl(`${API_BASE}/history`, {
    method: "DELETE",
  });

  return readJson(response, "Clearing history");
}

export async function clearAndFetchHistory(fetchImpl = fetch) {
  await clearHistory(fetchImpl);

  try {
    const history = await fetchHistory(fetchImpl);
    return { history, historyError: null };
  } catch (historyError) {
    return { history: [], historyError };
  }
}
