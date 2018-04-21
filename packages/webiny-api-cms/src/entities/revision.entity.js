// @flow
import { Entity } from "webiny-api";
import Page from "./page.entity";
import WidgetModel from "./widget.model";

class Revision extends Entity {
    constructor() {
        super();

        this.attr("page").entity(Page);

        this.attr("name")
            .char()
            .setValidators("required");

        this.attr("title")
            .char()
            .setValidators("required");

        this.attr("slug")
            .char()
            .setValidators("required");

        this.attr("content")
            .models(WidgetModel)
            .onSet(widgets => {
                return widgets.map(widget => {
                    if (widget.origin) {
                        delete widget["data"];
                        delete widget["settings"];
                    }
                    return widget;
                });
            });

        this.attr("active")
            .boolean()
            .setDefaultValue(false)
            .onSet(value => {
                // Copy only if it is an existing revision
                if (value && value !== this.active && this.isExisting()) {
                    this.on("afterSave", async () => {
                        // Deactivate previously active revision
                        const activeRev = await Revision.findOne({
                            query: { active: true, page: (await this.page).id }
                        });
                        activeRev.active = false;
                        await activeRev.save();
                    }).setOnce();
                }
                return value;
            });

        this.on("afterUpdate", async () => {
            if (this.active) {
                // Copy relevant data to parent Page
                const page = await this.page;
                page.populate({
                    title: this.title,
                    slug: this.slug,
                    content: this.content
                });
                await page.save();
            }
        });
    }
}

Revision.classId = "CmsRevision";
Revision.tableName = "Cms_Revisions";

export default Revision;