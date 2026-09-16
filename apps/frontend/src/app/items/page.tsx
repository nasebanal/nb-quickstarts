"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/components/LocaleProvider";
import { createItem, listItems, type Item } from "@/lib/api";

export default function ItemsPage() {
  const { t } = useLocale();
  const { token, employeeCode, initializing } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemQuantity, setItemQuantity] = useState("0");
  const [itemError, setItemError] = useState("");

  // Still no token once AuthProvider has finished trying to restore one
  // from sessionStorage means either a real logout or navigating here
  // directly — send them back to log in rather than showing an empty/broken
  // page. Skipping this while `initializing` is true avoids bouncing a
  // logged-in viewer home on every plain page reload.
  useEffect(() => {
    if (!initializing && !token) {
      router.replace("/");
    }
  }, [initializing, token, router]);

  const refreshItems = async () => {
    setItems(await listItems());
  };

  useEffect(() => {
    refreshItems().catch((err) => {
      console.error("Failed to load items", err);
    });
  }, []);

  const onCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setItemError("");
    try {
      await createItem(token, { name: itemName, quantity: Number(itemQuantity) });
      setItemName("");
      setItemQuantity("0");
      await refreshItems();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!token) {
    return null;
  }

  return (
    <main className="container">
      <div className="nb-content">
        <h1>{t.app.title}</h1>

        <section>
          <p data-testid="auth-status">
            {t.app.loggedInAs} <strong>{employeeCode}</strong>
          </p>
        </section>

        <section>
          <h2>{t.app.itemListHeading}</h2>
          <table data-testid="item-table">
            <thead>
              <tr>
                <th>{t.app.columnName}</th>
                <th>{t.app.columnQuantity}</th>
                <th>{t.app.columnSource}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} data-testid={`item-row-${item.id}`}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2>{t.app.registerHeading}</h2>
          <form data-testid="item-form" onSubmit={onCreateItem}>
            <input
              name="name"
              placeholder={t.app.namePlaceholder}
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              required
            />
            <input
              name="quantity"
              type="number"
              placeholder={t.app.quantityPlaceholder}
              value={itemQuantity}
              onChange={(event) => setItemQuantity(event.target.value)}
              required
            />
            <button type="submit" data-testid="item-submit">
              {t.app.registerButton}
            </button>
          </form>
          <p className="error" data-testid="item-error">
            {itemError}
          </p>
        </section>
      </div>
    </main>
  );
}
