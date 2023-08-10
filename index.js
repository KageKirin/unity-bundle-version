#!/usr/bin/env node

'use strict';

const fs = require('fs');
const glob = require("glob");
const { ArgumentParser } = require('argparse');
const { version } = require('./package.json');
const { mainModule } = require('process');
const yaml = require('js-yaml');

const parser = new ArgumentParser({
  description: 'get/set/bump/compare the current bundleVersion to a given ProjectSettings.asset (YAML)',
  add_help: true,
});

parser.add_argument('-v', '--version', { help: 'print package version and exit', action: 'version', version });

const subparsers = parser.add_subparsers({
    title: 'actions',
    dest: 'subcommand',
    help:'action to execute'
})

const get_parser = subparsers.add_parser('get',   {aliases: ['g'], help: 'gets the current bundleVersion of a given ProjectSettings.asset (YAML)' })
const set_parser = subparsers.add_parser('set',   {aliases: ['s'], help: 'sets the current bundleVersion of a given ProjectSettings.asset (YAML)' })
const bump_parser = subparsers.add_parser('bump', {aliases: ['b'], help: 'bumps the current bundleVersion of a given ProjectSettings.asset (YAML)' })
const cmp_parser = subparsers.add_parser('cmp',   {aliases: ['c'], help: 'compare the current bundleVersion of a given ProjectSettings.asset (YAML)' })

const parsers = [get_parser, set_parser, bump_parser, cmp_parser]

parsers.forEach(p => {
    p.add_argument('-r', '--regex', {
        help: `ECMAScript Regular Expression to parse the version string for verification.
Defaults to being semver, i.e. "major.minor.patch"
Set if you to be compatible with a different, non-semver format.`,
        type: String,
        default: '^(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)(\\.(?<patch>0|[1-9]\\d*))?(?:-(?<prerelease>(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$'
    })

    p.add_argument('file', { help: 'the .csproj from which to read/write the version.'})
})

set_parser.add_argument('-v', '--version', {
    help: 'the semver version to set; has to be compatible to the provided regex.',
    type: String,
    required: true
})


bump_parser.add_argument('-M', '--major', {
    help: 'bump the major revision.',
    action: 'store_true'
})
bump_parser.add_argument('-m', '--minor', {
    help: 'bump the minor revision.',
    action: 'store_true'
})
bump_parser.add_argument('-p', '--patch', {
    help: 'bump the patch revision.',
    action: 'store_true'
})

cmp_parser.add_argument('-v', '--version', {
    help: 'the semver version to compare to; has to be compatible to the provided regex.',
    type: String,
    required: true
})

const args = parser.parse_args();

async function run()
{
    // console.dir(args)
    switch(args.subcommand)
    {
        case 'get':  return get_version();
        case 'set':  return set_version();
        case 'bump': return bump_version();
        case 'cmp':  return compare_version();
    }
}
run();

function get_version()
{
    try
    {
        const [doc, schema] = parse_unityfile(args.file);
        // console.dir(doc)
        if (doc[0].PlayerSettings.bundleVersion)
        {
            const ver = parse_version(doc[0].PlayerSettings.bundleVersion);
            if (ver)
            {
                console.log(doc[0].PlayerSettings.bundleVersion);
            }
            else
            {
                console.error(`failed to parse ${args.file} version`);
                return 1;
            }
        }
        else
        {
            console.error(`invalid ${args.file} does not contain version`);
            return 1;
        }
    }
    catch (error)
    {
        console.error(error.message);
        return 1;
    }

    return 0;
}

function set_version()
{
    try
    {
        const [doc, schema] = parse_unityfile(args.file);
        // console.dir({doc: doc})
        if (doc[0].PlayerSettings.bundleVersion)
        {
            const ver = parse_version(doc[0].PlayerSettings.bundleVersion);
            if (ver)
            {
                doc[0].PlayerSettings.bundleVersion = args.version;
                write_unityfile(doc, args.file, schema);
            }
            else
            {
                console.error(`failed to parse ${args.file} bundleVersion`);
                return 1;
            }
        }
        else
        {
            console.error(`invalid ${args.file} does not contain version`);
            return 1;
        }

        // read back
        const [doc2, schema2] = parse_unityfile(args.file);
        // console.dir({doc2: doc2})
        // console.dir(doc2[0].PlayerSettings)
        if (doc2[0].PlayerSettings.bundleVersion)
        {
            const ver = parse_version(doc2[0].PlayerSettings.bundleVersion);
            if (ver)
            {
                console.log(doc2[0].PlayerSettings.bundleVersion);
            }
            else
            {
                console.error(`failed to parse ${args.file} version`);
                return 1;
            }

            if (doc2[0].PlayerSettings.bundleVersion === doc[0].PlayerSettings.bundleVersion)
            {
                // no issues
            }
            else
            {
                console.error("readback version different from input version");
                return 1;
            }
        }
        else
        {
            console.error(`invalid ${args.file} does not contain version`);
            return 1;
        }
    }
    catch (error)
    {
        console.error(error.message);
        return 1;
    }

    return 0;
}

function bump_version()
{
    try
    {
        const [doc, schema] = parse_unityfile(args.file);
        // console.dir({doc: doc})
        if (doc[0].PlayerSettings.bundleVersion)
        {
            const ver = parse_version(doc[0].PlayerSettings.bundleVersion);
            if (ver)
            {
                let [major, minor, patch, prerelease, buildmetadata] = ver;
                // console.dir({ver});
                // console.dir({major, minor, patch, prerelease, buildmetadata});

                if (args.major)
                {
                    major++;
                }
                if (args.minor)
                {
                    minor++;
                }
                if (args.patch)
                {
                    patch++;
                }
                doc[0].PlayerSettings.bundleVersion = `${major}.${minor}.${patch}`;

                if (prerelease)
                {
                    doc[0].PlayerSettings.bundleVersion += `-${prerelease}`;
                }
                if (buildmetadata)
                {
                    doc[0].PlayerSettings.bundleVersion += `+${buildmetadata}`;
                }

                write_unityfile(doc, args.file, schema);
            }
            else
            {
                console.error(`failed to parse ${args.file} bundleVersion`);
                return 1;
            }
        }
        else
        {
            console.error(`invalid ${args.file} does not contain version`);
            return 1;
        }

        // read back
        const [doc2, schema2] = parse_unityfile(args.file);
        // console.dir({doc2: doc2})
        // console.dir(doc2[0].PlayerSettings)
        if (doc2[0].PlayerSettings.bundleVersion)
        {
            const ver = parse_version(doc2[0].PlayerSettings.bundleVersion);
            if (ver)
            {
                console.log(doc2[0].PlayerSettings.bundleVersion);
            }
            else
            {
                console.error(`failed to parse ${args.file} version`);
                return 1;
            }

            if (doc2[0].PlayerSettings.bundleVersion === doc[0].PlayerSettings.bundleVersion)
            {
                // no issues
            }
            else
            {
                console.error("readback version different from input version");
                return 1;
            }
        }
        else
        {
            console.error(`invalid ${args.file} does not contain version`);
            return 1;
        }
    }
    catch (error)
    {
        console.error(error.message);
        return 1;
    }

    return 0;
}

function compare_version()
{
    try
    {
        const [doc, schema] = parse_unityfile(args.file);
        // console.dir({doc: doc})
        if (doc[0].PlayerSettings.bundleVersion && args.version)
        {
            const cmp = compare_versions(args.version, doc[0].PlayerSettings.bundleVersion);
            console.log("%i", cmp);
        }
        else
        {
            console.error("invalid .csproj does not contain version");
            return 1;
        }
    }
    catch (error)
    {
        console.error(error.message);
        return 1;
    }

    return 0;
}

//-----------------------------------------------------------------------------

function parse_version(version)
{
    const match = version.match(args.regex);
    if (match)
    {
        // console.dir({groups: match.groups});
        return [match.groups.major, match.groups.minor, match.groups.patch, match.groups.prerelease, match.groups.buildmetadata];
    }
    return null
}

function parse_unityfile(path)
{
    const types = {};
    let file = fs.readFileSync(path, 'utf8');

    // remove the unity tag line
    file = file.replace( /%TAG.+\r?\n?/, '' );

    // replace each subsequent tag with the full line + map any types
    file = file.replace( /!u!([0-9]+).+/g, ( match, p1 ) => {
        // create our mapping for this type
        if ( !( p1 in types ) )
        {
            const type = new yaml.Type( `tag:unity3d.com,2011:${p1}`, {
                kind: 'mapping',
                construct: function ( data ) {
                    return data || {}; // in case of empty node
                },
                instanceOf: Object
            } );
            types[p1] = type;
        }

        return `!<tag:unity3d.com,2011:${p1}>`
    });
    //console.log("fixedup string\n", file)

    // create our schema
    const schema = yaml.DEFAULT_SCHEMA.extend(Object.values(types));

    // parse our yaml
    const objAr = yaml.loadAll(file, null, { schema });

    return [objAr, schema];
}

function write_unityfile(objAr, path, schema)
{
    let str = "%YAML 1.1\n%TAG !u! tag:unity3d.com,2011:\n--- !u!129 &1\n"
    objAr.forEach(element => {
        str += yaml.dump(element, null, { schema: schema }); //noArrayIndent: true, flowLevel: -1,
    });
    str = str.replace(/(null)/g, '');
    fs.writeFileSync(path, str);
}


function compare_versions(version_A, version_B)
{
    const a_version = parse_version(version_A);
    if (a_version === null || a_version === undefined) throw(`failed to parse '{version_A}'`);
    let [a_major, a_minor, a_patch, a_prerelease, a_buildmetadata] = a_version;

    const b_version = parse_version(version_B);
    if (b_version === null || b_version === undefined) throw(`failed to parse '{version_B}'`);
    let [b_major, b_minor, b_patch, b_prerelease, b_buildmetadata] = b_version;

    if (a_major < b_major)
        return -1;
    else if(a_major > b_major)
        return 1;

    if (a_minor < b_minor)
        return -1;
    else if(a_minor > b_minor)
        return 1;

    if (a_patch < b_patch)
        return -1;
    else if(a_patch > b_patch)
        return 1;

    if (a_prerelease < b_prerelease)
        return -1;
    else if(a_prerelease > b_prerelease)
        return 1;

    if (a_buildmetadata < b_buildmetadata)
        return -1;
    else if(a_buildmetadata > b_buildmetadata)
        return 1;

    return 0;
}
