<script lang="tsx">
/** @jsxImportSource vue */
import { defineComponent } from "vue";

export default defineComponent({
  setup(_props) {
    return () => (
      <form>
        <div class="form-field">
          <label for="numbers">Numbers</label>
          <select-enhancer>
            <combobox-field id="numbers" name="numbers" valueis="anyvalue" onFilterchange={console.log} />
            <combobox-listbox>
              <combobox-option value="1">One</combobox-option>
              <combobox-option value="2">Two</combobox-option>
              <combobox-option value="3">Three</combobox-option>
            </combobox-listbox>
          </select-enhancer>
        </div>

        <div class="form-field">
          <checkbox-group min="2" max="3">
            <fieldset>
              <legend>Favorite Subjects</legend>

              <div>
                <input id="math" name="subjects" type="checkbox" value="math" />
                <label for="math">Math</label>

                <input id="bible" name="subjects" type="checkbox" value="bible" checked />
                <label for="bible">Bible</label>

                <input id="science" name="subjects" type="checkbox" value="science" />
                <label for="science">Science</label>

                <input id="english" name="subjects" type="checkbox" value="english" />
                <label for="english">English</label>
              </div>
            </fieldset>
          </checkbox-group>
        </div>
      </form>
    );
  },
});
</script>
