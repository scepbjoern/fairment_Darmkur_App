export default function HelpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">App‑Hilfe</h1>

      {/* Inhaltsverzeichnis */}
      <div className="card p-4">
        <div className="text-sm text-gray-300 font-medium mb-2">Inhalt</div>
        <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
          <li><a className="underline" href="#einleitung">Einleitung</a></li>
          <li><a className="underline" href="#tagebuch">Tagebuch führen</a></li>
          <li><a className="underline" href="#reflexionen">Reflexionen erfassen</a></li>
          <li><a className="underline" href="#auswertungen">Auswertungen anschauen</a></li>
          <li><a className="underline" href="#export">Export durchführen</a></li>
          <li><a className="underline" href="#links">Links aufrufen</a></li>
          <li><a className="underline" href="#einstellungen">Einstellungen vornehmen</a></li>
          <li><a className="underline" href="#installation">App installieren</a></li>
          <li><a className="underline" href="#spracheingabe">Texte mündlich erfassen</a></li>
          <li><a className="underline" href="#aenderungen">Was hat sich geändert?</a></li>
        </ul>
      </div>

      {/* Einleitung */}
      <section id="einleitung" className="card p-4 space-y-3">
        <h2 className="font-medium">Einleitung</h2>
        <p className="text-sm text-gray-300">
          Die Darmkur‑App hilft dir, deinen Alltag während der Kur einfach zu dokumentieren und Fortschritte zu sehen.
          Du kannst täglich Werte festhalten (z. B. Wohlbefinden, Schlaf, Bewegung), kurze Notizen schreiben und Fotos hinzufügen.
          Zusätzlich erfasst du in regelmäßigen Abständen Reflexionen und bekommst übersichtliche Auswertungen.
        </p>
        <p className="text-sm text-gray-300">
          Die App ist mobilfreundlich, kann als App auf dem Startbildschirm installiert werden und funktioniert angenehm
          auf Smartphones wie auch am Desktop.
        </p>
      </section>

      {/* Tagebuch */}
      <section id="tagebuch" className="card p-4 space-y-3">
        <h2 className="font-medium">Tagebuch führen</h2>
        <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
          <li><span className="font-medium">Datum & Kalender:</span> Oben kannst du das Datum wechseln. Im Kalender siehst du, an welchen Tagen Einträge vorhanden sind.</li>
          <li><span className="font-medium">Tages‑Einstellungen:</span> Wähle die Phase (1–3) und die Kategorie (Sanft/Medium/Intensiv) deines Tages.</li>
          <li><span className="font-medium">Symptome:</span> Bewerte verschiedene Bereiche auf einer Skala von 1–10. Eigene Symptome können in den Einstellungen angelegt werden und erscheinen hier ebenfalls.</li>
          <li><span className="font-medium">Minisparklines (7‑Tage‑Verlauf):</span> Neben jedem Symptom und beim Stuhl siehst du eine kleine Verlaufslinie der letzten sieben Tage – farbcodiert: unten schlechtere Werte rot → orange → sehr helles Grau (Mitte) → grün für bessere Werte.</li>
          <li><span className="font-medium">Gestern‑Markierung (Symptome & Stuhl):</span> Der gestrige Wert wird <em>ohne Text</em> nur visuell in den Number‑Pills markiert: Ring um die gestrige Zahl, und wenn gestern = heute, ein kleiner Punkt in der Pill.</li>
          <li><span className="font-medium">Stuhl (Bristol 1–7):</span> Trage deinen Wert schnell per Tippen ein. Ganz links gibt es zusätzlich eine <strong>„—“‑Option</strong> für <em>kein Stuhlgang</em>. Diese wird intern als <code>99</code> gespeichert und in Auswertungen/Sparklines als „kein Wert“ behandelt (also ignoriert). Eine kurze Erklärung findest du über den verlinkten Guide‑Ausschnitt. Auch hier gelten Sparkline und Gestern‑Markierung wie oben.</li>
          <li><span className="font-medium">Gewohnheiten:</span> Hake täglich durchgeführte Gewohnheiten einfach ab. Eigene Gewohnheiten können in den Einstellungen angelegt werden und erscheinen hier ebenfalls. Für „Gestern“ gibt es einen dezenten blauen Ring, wenn die Gewohnheit gestern aktiv war und heute noch nicht. Es gibt keinen Punkt‑Indikator.</li>
          <li><span className="font-medium">Entwürfe & Speichern (Symptome):</span> Änderungen an Number‑Pills werden zunächst als <em>Entwurf</em> gehalten und visuell hervorgehoben. Unten erscheint eine <em>fixierte Speicherleiste</em> (Save‑Bar) mit <strong>Speichern</strong>/<strong>Verwerfen</strong>. Nach der Aktion erscheinen kurze <em>Toasts</em> als Rückmeldung.</li>
          <li><span className="font-medium">Bemerkungen:</span> Schreibe Freitext‑Notizen. Nach dem Speichern wird der Text angezeigt und kann jederzeit wieder bearbeitet oder gelöscht werden.</li>
          <li><span className="font-medium">Ernährungsnotizen:</span> Halte Mahlzeiten mit Uhrzeit fest. Du kannst Fotos hinzufügen (vom Gerät oder direkt mit der Kamera) und sie später betrachten oder entfernen.</li>
        </ul>
      </section>

      {/* Reflexionen */}
      <section id="reflexionen" className="card p-4 space-y-3">
        <h2 className="font-medium">Reflexionen erfassen</h2>
        <p className="text-sm text-gray-300">
          Erfasse in regelmäßigen Abständen eine <em>Wochen‑</em> oder <em>Monatsreflexion</em>. Du beantwortest dabei vier
          kurze Fragen (Veränderungen, Dankbarkeit, Vorsätze, Bemerkungen). Du kannst Einträge später bearbeiten oder löschen
          und auch Fotos hinzufügen.
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
          <li><span className="font-medium">Optionales Körpergewicht:</span> Du kannst ein Gewicht mit <strong>einer Dezimalstelle</strong> erfassen (Format z. B. <code>72,5</code>). Die Eingabe ist optional und wird in der Liste formatiert angezeigt.</li>
          <li><span className="font-medium">Speichern:</span> Beim Anlegen/Bearbeiten hilft eine <em>Save‑Bar</em> unten am Bildschirm. Du kannst Änderungen gesammelt speichern oder verwerfen; kurze <em>Toasts</em> bestätigen die Aktion.</li>
        </ul>
      </section>

      {/* Auswertungen */}
      <section id="auswertungen" className="card p-4 space-y-3">
        <h2 className="font-medium">Auswertungen anschauen</h2>
        <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
          <li><span className="font-medium">Woche:</span> Kurze Trends über die aktuelle Woche, z. B. Wohlbefinden, Stuhl, Gewohnheiten und Symptome.</li>
          <li><span className="font-medium">Phase:</span> Vergleiche Kennzahlen je Phase (Durchschnittswerte und Verläufe).</li>
          <li><span className="font-medium">Gesamt:</span> Langfristige Entwicklung über den gesamten Zeitraum. Markierungen helfen, Reflexionszeitpunkte einzuordnen.</li>
        </ul>
      </section>

      {/* Export */}
      <section id="export" className="card p-4 space-y-3">
        <h2 className="font-medium">Export durchführen</h2>
        <p className="text-sm text-gray-300">
          Du kannst deine Daten als <strong>CSV</strong> (für Tabellenkalkulation) oder als <strong>PDF</strong> exportieren.
          Wähle optional einen Zeitraum. Im PDF kannst du zusätzlich Fotos einbinden und die Miniaturgröße festlegen.
        </p>
      </section>

      {/* Links */}
      <section id="links" className="card p-4 space-y-3">
        <h2 className="font-medium">Links aufrufen</h2>
        <p className="text-sm text-gray-300">
          Im Menü findest du <em>Links</em> zu hilfreichen Dokumenten (z. B. Ernährungs‑Tabelle, Guide) und – wenn gewünscht –
          deine eigenen, in den Einstellungen hinterlegten Links. Diese öffnen sich in einem neuen Tab/Fenster.
        </p>
      </section>

      {/* Einstellungen */}
      <section id="einstellungen" className="card p-4 space-y-3">
        <h2 className="font-medium">Einstellungen vornehmen</h2>
        <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
          <li><span className="font-medium">Profil:</span> Anzeigename und Benutzername verwalten. Profilbild hochladen, zuschneiden und speichern.</li>
          <li><span className="font-medium">UI:</span> Dark/Bright‑Theme auswählen.</li>
          <li><span className="font-medium">Erfassung:</span> Autosave (Häufigkeit) und Foto‑Einstellungen (Format/Qualität/Größe) für Uploads festlegen.</li>
          <li><span className="font-medium">Gewohnheiten:</span> Eigene Gewohnheiten anlegen und verwalten (z. B. zusätzliche tägliche To‑dos für dich persönlich).</li>
          <li><span className="font-medium">Eigene Symptome:</span> Zusätzliche, persönliche Symptome anlegen.</li>
          <li><span className="font-medium">Links:</span> Eigene Links hinterlegen, die im Menü unter „Links“ erscheinen.</li>
        </ul>
        <div className="text-sm text-gray-300">
          <h3 className="font-medium mt-2">Icons für Gewohnheiten und Symptome</h3>
          <ul className="list-disc pl-5 space-y-1 mt-1">
            <li><strong>Gewohnheiten:</strong> In „Einstellungen → Gewohnheiten“ kannst du pro Gewohnheit ein Icon setzen. Erlaubt sind <em>Emoji</em> (z. B. 😊) oder <em>Material‑Symbols</em> (z. B. <code>fitness_center</code>). Vorschau und Speichern‑Button stehen direkt daneben.</li>
            <li><strong>Standard‑Symptome:</strong> In „Einstellungen → Symptome“ kannst du die Icons der vorgegebenen Symptome <em>nutzerindividuell</em> überschreiben. Ebenfalls Emoji oder Material‑Symbols (z. B. <code>mood</code>).</li>
            <li><strong>Eigene Symptome:</strong> Für selbst angelegte Symptome lässt sich das Icon ebenso setzen/ändern.</li>
            <li><strong>Hinweis:</strong> Emoji werden direkt angezeigt. Bei Material‑Symbols gibst du den <em>Namen</em> des Symbols ein; angezeigt wird das entsprechende Symbol (abgerundeter Stil).</li>
          </ul>
        </div>
      </section>

      {/* Installation */}
      <section id="installation" className="card p-4 space-y-3">
        <h2 className="font-medium">App installieren</h2>
        <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
          <li><span className="font-medium">Direkt in der App:</span> Wenn dein Browser es unterstützt, erscheint im Menü der Punkt „App installieren“.</li>
          <li><span className="font-medium">Android (Chrome):</span> Menü öffnen → „Zum Startbildschirm hinzufügen“ bzw. „Installieren“.</li>
          <li><span className="font-medium">iOS (Safari):</span> Teilen‑Symbol → „Zum Home‑Bildschirm“.</li>
          <li><span className="font-medium">Desktop‑Browser:</span> In der Adressleiste kann ein Installations‑Icon erscheinen („App installieren“).</li>
        </ul>
      </section>

      {/* Spracheingabe */}
      <section id="spracheingabe" className="card p-4 space-y-3">
        <h2 className="font-medium">Texte mündlich erfassen</h2>
        <p className="text-sm text-gray-300">
          Neben wichtigen Textfeldern findest du ein Mikrofon‑Symbol. Tippe es an, um eine kurze Sprachnotiz aufzunehmen,
          und tippe erneut, um zu stoppen. Der gesprochene Text wird automatisch in Schrift umgewandelt und dem Feld
          hinzugefügt. Du kannst ihn anschließend noch anpassen und speichern.
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
          <li><span className="font-medium">Wo verfügbar?</span> Bei „Bemerkungen“, neuen Ernährungsnotizen sowie bei den vier Feldern der Reflexionen.</li>
          <li><span className="font-medium">Berechtigung:</span> Der Browser fragt einmalig nach Mikrofon‑Zugriff. Erlaube die Nutzung, damit die Aufnahme funktioniert.</li>
          <li><span className="font-medium">Modellwahl:</span> Über das Zahnrad‑Symbol kannst du das Transkriptions‑Modell auswählen. Wenn du unsicher bist, lass die Voreinstellung.</li>
        </ul>
      </section>
    </div>
  )
}
