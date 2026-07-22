const { execSync } = require('child_process');
const fs = require('fs');

const run = (cmd) => {
    try {
        return execSync(cmd).toString().trim().split('\n').filter(Boolean);
    } catch (e) {
        return [];
    }
};

const diff = (cmd) => {
    try {
        return execSync(cmd).toString().trim();
    } catch (e) {
        return '';
    }
}

const data = {
    dev_not_in_main: run('git --no-pager log --oneline main..dev'),
    main_not_in_dev: run('git --no-pager log --oneline dev..main'),
    chatboot_not_in_main: run('git --no-pager log --oneline main..chatboot'),
    chatboot_not_in_dev: run('git --no-pager log --oneline dev..chatboot'),
    dev_diff_main: diff('git --no-pager diff --stat main..dev'),
    chatboot_diff_dev: diff('git --no-pager diff --stat dev..chatboot'),
};

fs.writeFileSync('compare_branches.json', JSON.stringify(data, null, 2));
